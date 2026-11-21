// From app/: node scripts/indexnow-ping.mjs --diff | --file urls.txt | --stdin
// Deployment runs also pass --expected <built sitemap.xml.body> --revision <sha>.
import { readFile, writeFile, rename, mkdir, appendFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parseArgs } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";

const origin = "https://onoldground.com";
const key = "b682cf99b2e2bac4da25c95eb8d8f9a8";
const keyLocation = origin + "/" + key + ".txt";
const endpoint = "https://api.indexnow.org/indexnow";
const require = createRequire(import.meta.url);
const defaultManifest = fileURLToPath(new URL("../.tmp/indexnow/manifest.json", import.meta.url));

function report(message, level = "notice") {
  console.log(process.env.GITHUB_ACTIONS ? "::" + level + "::" + message.replaceAll("%", "%25").replaceAll("\n", "%0A").replaceAll("\r", "%0D") : message);
  if (process.env.GITHUB_STEP_SUMMARY) {
    return appendFile(process.env.GITHUB_STEP_SUMMARY, "- " + message.replace(/[\r\n]/g, " ") + "\n");
  }
}

function page(value) {
  const url = new URL(value);
  if (url.origin !== origin || url.href !== value || url.username || url.password ||
      /[?#\\\s]/.test(value) || /%(?:2e|2f|5c)/i.test(url.pathname) ||
      url.pathname.includes("//") || (url.pathname !== "/" && url.pathname.endsWith("/")) ||
      /^\/(?:sitemap\.xml|robots\.txt|_next|api)(?:\/|$)/i.test(url.pathname) || value === keyLocation) {
    throw new Error("Expected a canonical On Old Ground page URL: " + value);
  }
  return value;
}

// Read only direct sitemap:url/sitemap:loc children. A broken document must
// never turn a truncated response into a batch of removal notifications.
function sitemap(xml) {
  const { SaxesParser } = require("saxes");
  const parser = new SaxesParser({ xmlns: true });
  const ns = "http://www.sitemaps.org/schemas/sitemap/0.9";
  const stack = [];
  const urls = new Set();
  let location;
  let record;
  parser.on("doctype", () => { throw new Error("Unexpected sitemap DOCTYPE"); });
  parser.on("opentag", ({ uri, local }) => {
    stack.push(uri === ns ? local : null);
    if (stack[0] !== "urlset") throw new Error("Expected a sitemap urlset");
    if (stack.length === 2 && stack[1] === "url") record = null;
    if (stack.length === 3 && stack[1] === "url" && stack[2] === "loc") {
      if (record !== null) throw new Error("Duplicate loc in a sitemap record");
      location = "";
    } else if (location !== undefined) throw new Error("Unexpected element inside loc");
  });
  const collect = (text) => { if (location !== undefined) location += text; };
  parser.on("text", collect);
  parser.on("cdata", collect);
  parser.on("closetag", () => {
    if (location !== undefined) {
      record = page(location.trim());
      location = undefined;
    }
    if (stack.length === 2 && stack[1] === "url") {
      if (!record) throw new Error("Sitemap record has no loc");
      urls.add(record);
    }
    stack.pop();
  });
  parser.write(xml).close();
  if (!urls.has(origin + "/")) throw new Error("Sitemap missing the canonical home page");
  return urls;
}

async function get(url, timeout = 15000) {
  const response = await fetch(url, {
    redirect: "error", cache: "no-store", signal: AbortSignal.timeout(timeout),
  });
  if (response.status !== 200) throw new Error(url + " returned HTTP " + response.status);
  return response;
}

async function liveSitemap(expectedFile, revision) {
  const expected = expectedFile && sitemap(await readFile(expectedFile, "utf8"));
  const deadline = Date.now() + 600000;
  while (true) {
    try {
      const response = await get(origin + "/sitemap.xml", Math.min(15000, Math.max(1, deadline - Date.now())));
      const urls = sitemap(await response.text());
      if (!expected) return urls;
      if (response.headers.get("x-on-old-ground-revision") !== revision) {
        throw new Error("Production sitemap is serving another revision");
      }
      if (expected.size !== urls.size || ![...expected].every(url => urls.has(url))) {
        throw new Error("Production and build URL sets differ");
      }
      await report("Verified production revision " + revision + " and all " + urls.size + " build URLs.");
      return urls;
    } catch (error) {
      if (!expected || Date.now() >= deadline) throw error;
      console.log("Waiting for production: " + error.message);
      await sleep(Math.min(10000, deadline - Date.now()));
    }
  }
}

async function readManifest(path) {
  let text;
  try { text = await readFile(path, "utf8"); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { started: false, urls: new Set() };
  }
  const state = JSON.parse(text);
  if (state.version !== 1 || typeof state.started !== "boolean" || !Array.isArray(state.urls)) {
    throw new Error("Invalid accepted-URL manifest; restore it before retrying");
  }
  return { started: state.started, urls: new Set(state.urls.map(page)) };
}

async function saveManifest(path, state) {
  await mkdir(dirname(path), { recursive: true });
  const text = JSON.stringify({ version: 1, started: state.started, urls: [...state.urls].sort() }, null, 2);
  const temp = path + "." + process.pid + ".tmp";
  await writeFile(temp, text + "\n");
  await rename(temp, path);
}

async function submit(urlList, label) {
  console.log(label + " URL list: " + JSON.stringify(urlList));
  const response = await fetch(endpoint, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(30000),
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: "onoldground.com", key, keyLocation, urlList }),
  });
  const code = response.status;
  const receipt = label + ": " + urlList.length + " URL(s), HTTP " + code;
  if (code !== 200 && code !== 202) {
    throw new Error(receipt + ([403, 422].includes(code) ? " — KEY OR HOST CONFIGURATION ERROR" : ""));
  }
  await report(receipt + (code === 202 ? " (received, key validation pending)." : " (received)."));
}

async function run(args) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    diff: { type: "boolean" }, stdin: { type: "boolean" }, file: { type: "string" },
    manifest: { type: "string", default: defaultManifest },
    expected: { type: "string" }, revision: { type: "string" },
  } });
  const file = values.file ?? positionals[0];
  if (positionals.length > (values.file ? 0 : 1) || [values.diff, values.stdin, file].filter(Boolean).length > 1) {
    throw new Error("Choose --diff, a URL file, or stdin");
  }
  if (Boolean(values.expected) !== Boolean(values.revision) ||
      (values.revision && !/^[0-9a-f]{40}$/.test(values.revision))) {
    throw new Error("--expected and a full --revision SHA must be supplied together");
  }
  const path = values.manifest;
  const state = await readManifest(path);
  const live = await liveSitemap(values.expected, values.revision);
  let changed;
  const firstDiff = values.diff && !state.started;
  if (values.diff) {
    const added = [...live].filter(url => !state.urls.has(url));
    const removed = [...state.urls].filter(url => !live.has(url));
    changed = [...(firstDiff ? live : added), ...removed];
    await report("Sitemap has " + live.size + " URLs. Added " + added.length + ", removed " + removed.length + ".");
  } else {
    let input = "";
    if (file && file !== "-") input = await readFile(file, "utf8");
    else for await (const chunk of process.stdin.setEncoding("utf8")) input += chunk;
    changed = [...new Set(input.trim().split(/\s+/).filter(Boolean).map(page))];
    if (!changed.length) throw new Error("Explicit URL list is empty");
    for (const url of changed) {
      if (!live.has(url) && !state.urls.has(url)) {
        throw new Error("URL is absent from both the live sitemap and the accepted manifest: " + url);
      }
    }
  }
  if (!changed.length) return report("No changed URLs to submit.");
  const response = await get(keyLocation);
  if (response.headers.get("content-type")?.split(";")[0].trim() !== "text/plain") {
    throw new Error("IndexNow key must be served as text/plain");
  }
  if (!Buffer.from(await response.arrayBuffer()).equals(Buffer.from(key))) {
    throw new Error("Public key file does not contain exactly the key bytes");
  }
  await report("Verified the public key at " + keyLocation);
  if (firstDiff) {
    const entry = [...live].find(url => url.startsWith(origin + "/sites/"));
    if (!entry) throw new Error("No entry URL available for the initial test");
    const entryResponse = await get(entry);
    await entryResponse.body?.cancel();
    await submit([entry], "Initial entry test");
  }
  for (let offset = 0; offset < changed.length; offset += 10000) {
    const batch = changed.slice(offset, offset + 10000);
    await submit(batch, firstDiff ? "Initial sitemap submission" : "Changed pages");
    for (const url of batch) {
      if (live.has(url)) state.urls.add(url);
      else state.urls.delete(url);
    }
    if (values.diff) state.started = true;
    await saveManifest(path, state);
  }
}

export async function notify(args) {
  try {
    await run(args);
  } catch (error) {
    // Leave the caller successful and preserve unaccepted URLs for retry.
    const message = "IndexNow incomplete: " + error.message + ". Re-run the diff or the same explicit URL list.";
    try { await report(message, "error"); }
    catch { console.error(message); }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await notify(process.argv.slice(2));
}
