import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { notify } from "./indexnow-ping.mjs";

const host = "https://onoldground.com";
const home = host + "/";
const entry = host + "/sites/one";
const other = host + "/sites/two";
const retired = host + "/sites/retired";
const key = "b682cf99b2e2bac4da25c95eb8d8f9a8";
const revision = "a".repeat(40);
const xml = urls => '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
  urls.map(url => "<url><loc>" + url + "</loc></url>").join("") + "</urlset>";

async function setup(t, urls = [home, entry, other]) {
  const dir = await mkdtemp(join(tmpdir(), "indexnow-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, "manifest.json");
  const expected = join(dir, "sitemap.xml");
  await writeFile(expected, xml(urls));
  const config = { xml: xml(urls), key, status: () => 200, revision };
  const posts = [];
  const logs = [];
  t.mock.method(console, "log", line => logs.push(line));
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (url === host + "/sitemap.xml") return new Response(config.xml, { headers: { "x-on-old-ground-revision": config.revision } });
    if (url === host + "/" + key + ".txt") return new Response(config.key, { headers: { "content-type": "text/plain" } });
    if (url === entry) return new Response("entry");
    assert.equal(url, "https://api.indexnow.org/indexnow");
    assert.equal(options.method, "POST");
    assert.equal(options.redirect, "error");
    const body = JSON.parse(options.body);
    assert.equal(body.host, "onoldground.com");
    assert.equal(body.key, key);
    assert.equal(body.keyLocation, host + "/" + key + ".txt");
    posts.push(body.urlList);
    return new Response(null, { status: config.status(posts.length) });
  });
  return { dir, path, config, posts, logs, expected,
    run: (...args) => notify(["--manifest", path, ...args]),
    state: async () => JSON.parse(await readFile(path, "utf8")),
    baseline: (urls) => writeFile(path, JSON.stringify({ version: 1, started: true, urls })),
  };
}

test("probe, seed, revision check, no-op replay, and manual content repair", async t => {
  const f = await setup(t);
  f.config.status = () => 202;
  await f.run("--diff", "--expected", f.expected, "--revision", revision);
  assert.deepEqual(f.posts, [[entry], [home, entry, other]]);
  assert.ok(f.logs.some(line => line.includes("HTTP 202")));
  await f.run("--diff");
  const file = join(f.dir, "urls");
  await writeFile(file, other + "\n" + other);
  await f.run("--file", file);
  assert.deepEqual(f.posts.slice(2), [[other]]);
  assert.deepEqual((await f.state()).urls, [home, entry, other]);
});

test("partial seed checkpoints 10,000, retries outstanding URLs, then handles additions and deletions", async t => {
  const urls = [home, entry, ...Array.from({ length: 9999 }, (_, n) => host + "/sites/id-" + n)];
  const f = await setup(t, urls);
  f.config.status = count => count === 3 ? 429 : 200;
  await f.run("--diff");
  assert.deepEqual(f.posts.map(x => x.length), [1, 10000, 1]);
  assert.equal((await f.state()).urls.length, 10000);
  await f.run("--diff");
  assert.deepEqual(f.posts[3], urls.slice(10000));
  const next = [...urls.slice(0, -1), other];
  f.config.xml = xml(next);
  await f.run("--diff");
  assert.deepEqual(f.posts[4], [other, urls.at(-1)]);
});

test("endpoint outage, rejected batches and wrong key cannot advance the baseline", async t => {
  const f = await setup(t);
  await f.baseline([home, entry, retired]);
  for (const status of [403, 422, 503, 204]) {
    f.config.status = () => status;
    await f.run("--diff");
    assert.ok(f.logs.some(line => line.includes("HTTP " + status)));
    assert.deepEqual((await f.state()).urls, [home, entry, retired]);
  }
  assert.equal(f.logs.filter(line => line.includes("KEY OR HOST CONFIGURATION ERROR")).length, 2);
  f.config.status = () => { throw new Error("endpoint unreachable"); };
  await f.run("--diff");
  assert.ok(f.logs.some(line => line.includes("endpoint unreachable")));
  const before = f.posts.length;
  f.config.key += "\n";
  await f.run("--diff");
  assert.equal(f.posts.length, before);
  assert.deepEqual((await f.state()).urls, [home, entry, retired]);
});

test("invalid inputs, a truncated sitemap, and a damaged manifest produce zero POSTs", async t => {
  const f = await setup(t);
  const file = join(f.dir, "urls");
  for (const url of ["https://mirror.vercel.app/", host + "/sitemap.xml", entry + "?from=walk",
    entry + "#top", host + "/" + key + ".txt", host + "/not-in-sitemap", "http://onoldground.com/"]) {
    await writeFile(file, entry + "\n" + url);
    await f.run(file);
  }
  f.config.xml = xml([home, entry]).replace("</urlset>", "");
  await f.run("--diff");
  await writeFile(f.path, "broken");
  await f.run("--diff");
  assert.equal(f.posts.length, 0);
  assert.equal(await readFile(f.path, "utf8"), "broken");
});

test("timeout on an old revision or a wrong same-size set sends nothing", async t => {
  const f = await setup(t);
  let now = Date.now();
  t.mock.method(Date, "now", () => (now += 601000));
  const args = ["--diff", "--expected", f.expected, "--revision", revision];
  f.config.revision = "b".repeat(40);
  await f.run(...args);
  f.config.revision = revision;
  f.config.xml = xml([home, entry, retired]);
  await f.run(...args);
  assert.equal(f.posts.length, 0);
  assert.ok(f.logs.some(line => line.includes("another revision")));
  assert.ok(f.logs.some(line => line.includes("URL sets differ")));
});
