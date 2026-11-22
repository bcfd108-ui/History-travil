import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { leadId } from "../lib/machine-queue.mjs";
import {
  SECRET_NAME,
  assertRunBranch,
  completeWithProvider,
  configProblems,
  dossierSlug,
  entryFromDossier,
  groundFromOpenRuns,
  leadIdsInReport,
  loadWorkerConfig,
  renderReport,
  requiresReading,
  runResearch,
  suspectDuplicate,
  validateDossier,
  workflowCron,
} from "../lib/machine-worker.mjs";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(appRoot, "..");
const config = loadWorkerConfig(appRoot);

function item(partial) {
  const row = {
    name: partial.name,
    town: partial.town || "",
    county: partial.county || "",
    state: partial.state,
    tier: 1,
    anchorPosture: partial.anchorPosture ?? "NONE",
    registerId: partial.registerId ?? null,
    queueState: partial.queueState || "queued",
    projectedSlug: "test",
    targetSlug: null,
    reconcile: null,
    attempts: [],
    sources: [{ file: "test.md", row: partial.row || 1, dialect: "desk-sweep-4", role: "lead" }],
  };
  row.id = leadId(row, "test.md");
  return row;
}

function queue(items) {
  return JSON.stringify({ version: 1, phase: 1, kind: "research", items });
}

function dossier({ name = "Fixture Reading Yard", town = "Fixture", anchor = "None — NO-ANCHOR research reading", latitude = "", longitude = "", coordinateSource = "", sources = "1. Library of Congress record: https://www.loc.gov/item/fixture-reading-yard/", progression = "This is a reading. No visitor is sent to the ground.", observations = "No find is filed." } = {}) {
  return `**Trip gate — Checked November 21, 2026. No public entrance was verified, so this stays a reading. [1]**

## 2. Story
**${name}, ${town} · Research draft · Machine**

A free public record is the only support for this reading. The paragraph stays with that record and does not supply an hour, a street address, or a date the record does not carry. What the record does not say is left for the gaps section. [1]

## 3. Then and now
The record describes the place in its own time. It does not describe a public entrance now. [1]

## 4. Surviving features and access
No public feature was verified from a free source. [1]

## 5. Public trip progression
${progression}

## 6. Gaps and conflicts
The record does not name the holder of the ground, and that absence is printed instead of filled in.

## 7. Historical photo records
No frame adopted. No photograph was inspected.

## 8. Optional observations
${observations}

## 9. Sources
${sources}

## 10. Structured locator
- Stable site name: ${name}
- Town: ${town}
- Public anchor: ${anchor}
- Latitude: ${latitude}
- Longitude: ${longitude}
- Coordinate source: ${coordinateSource}
- National Register reference:
`;
}

const readingLead = () => item({ name: "Fixture Reading Yard", town: "Fixture", state: "WY", anchorPosture: "NONE" });

const pinned = "nvidia/nemotron-3.5-super-vl:free";
const researchSecret = "MACHINE_RESEARCH_OPENROUTER_KEY";
const workflowFixture = [
  "on:", "  schedule:", '    - cron: "0 */2 * * *"', "jobs:",
  "  research:", "    steps:", "      - run: node app/scripts/machine-research.mjs",
  "        env:", "          " + researchSecret + ": " + "${{ secrets." + researchSecret + " }}",
  "          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}", "",
].join("\n");
const runChecker = (args = [], app = appRoot) => spawnSync(process.execPath, [join(app, "scripts", "check-machine-worker.mjs"), ...args], { encoding: "utf8", cwd: repoRoot });

test("config specifies the sole OpenRouter free model, secret and workflow cadence", () => {
  assert.equal(SECRET_NAME, researchSecret);
  assert.equal(config.provider, "openrouter");
  assert.equal(config.model, pinned);
  assert.equal(config.secretName, researchSecret);
  assert.equal(workflowCron(workflowFixture), config.schedule);
  assert.equal(config.perRunCap, 2);
  assert.equal(config.schedule, "0 */2 * * *");
  for (const patch of [{ provider: "xai" }, { secretName: "MACHINE_BUILDER_KEY" }, { secretName: "" }, { model: pinned.replace(":free", "") }, { model: "openrouter/free" }, { model: "other/model:free" }, { fallback: "other/model" }]) {
    assert.notEqual(configProblems({ ...config, ...patch }).length, 0);
  }
});

test("adapter sends one pinned, zero-price OpenRouter request with no fallback", async () => {
  const requests = [];
  const reply = await completeWithProvider({ provider: "openrouter", model: pinned, key: "fixture-key", prompt: "fixture prompt", fetchImpl: async (url, opts) => {
    requests.push({ url, opts });
    return { ok: true, json: async () => ({ choices: [{ message: { content: "fixture output" } }] }) };
  } });
  assert.equal(reply, "fixture output");
  assert.equal(requests.length, 1);
  const [{ url, opts }] = requests;
  assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(opts.headers.Authorization, "Bearer fixture-key");
  assert.equal(opts.redirect, "error");
  const body = JSON.parse(opts.body);
  assert.equal(body.model, pinned);
  assert.deepEqual(body.provider, { allow_fallbacks: false, max_price: { prompt: 0, completion: 0 } });
  assert.equal(Object.hasOwn(body, "models"), false);
  assert.equal(Object.hasOwn(body, "route"), false);
});

test("adapter rejects a paid, router, alternate-free or incorrect-provider request before fetch", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; throw new Error("unexpected fetch"); };
  for (const [provider, model] of [["openrouter", pinned.replace(":free", "")], ["openrouter", "openrouter/free"], ["openrouter", "other/model:free"], ["xai", pinned]]) {
    await assert.rejects(completeWithProvider({ provider, model, key: "fixture-key", prompt: "fixture", fetchImpl }), /approved free research route/);
  }
  assert.equal(calls, 0);
});

test("adapter does not fallback on quota failure or leak provider response body", async () => {
  let calls = 0;
  await assert.rejects(completeWithProvider({ provider: "openrouter", model: pinned, key: "fixture-key", prompt: "fixture", fetchImpl: async () => {
    calls++;
    return { ok: false, status: 429, json: async () => { throw new Error("untrusted reply"); } };
  } }), { message: "research provider returned 429" });
  assert.equal(calls, 1);
});

test("worker checker requires workflow by default and validates desk-held copies by explicit path", () => {
  const temp = mkdtempSync(join(tmpdir(), "machine-worker-contract-"));
  try {
    const app = join(temp, "app");
    for (const dir of ["scripts", "lib", "machine"]) mkdirSync(join(app, dir), { recursive: true });
    for (const file of ["scripts/check-machine-worker.mjs", "scripts/machine-research.mjs", "lib/machine-worker.mjs", "lib/machine-queue.mjs", "machine/worker.config.json", "package.json"]) {
      writeFileSync(join(app, file), readFileSync(join(appRoot, file)));
    }
    const missing = runChecker([], app);
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /research workflow missing/);
    const file = join(temp, "desk-held.yml");
    writeFileSync(file, workflowFixture);
    const good = runChecker(["--workflow", file], app);
    assert.equal(good.status, 0, good.stderr);
    for (const [bad, message] of [
      [workflowFixture + "# MACHINE_BUILDER_KEY", /MACHINE_BUILDER_KEY.*forbidden/],
      [workflowFixture + "          OTHER: ${{ secrets.OTHER_AI_KEY }}", /unapproved workflow secret/],
      [workflowFixture + "          DUP: ${{ secrets." + researchSecret + " }}", /exactly one/],
      [workflowFixture.replace("0 */2 * * *", "0 */3 * * *"), /workflow cron/],
    ]) {
      writeFileSync(file, bad);
      const result = runChecker(["--workflow", file], app);
      assert.equal(result.status, 1);
      assert.match(result.stderr, message);
    }
    writeFileSync(file, workflowFixture);
    const notRuntime = join(app, "scripts", "irrelevant.test.mjs");
    writeFileSync(notRuntime, "// MACHINE_BUILDER_KEY");
    assert.equal(runChecker(["--workflow", file], app).status, 0);
    for (const target of ["scripts/helper.mjs", "lib/helper.ts", "machine/extra.config.json", "package.json"]) {
      const path = join(app, target);
      const original = target === "package.json" ? readFileSync(path, "utf8") : null;
      writeFileSync(path, '"MACHINE_BUILDER_KEY"');
      const result = runChecker(["--workflow", file], app);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /MACHINE_BUILDER_KEY.*forbidden/);
      if (original === null) rmSync(path);
      else writeFileSync(path, original);
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("a missing key exits clean and does not research", async () => {
  let called = false;
  const result = await runResearch({
    config,
    key: "",
    queueText: queue([readingLead()]),
    complete: async () => {
      called = true;
      return "";
    },
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.openedPr, false);
  assert.equal(result.issueFiled, false);
  assert.match(result.summary, new RegExp(SECRET_NAME));
  assert.equal(called, false);
});

test("a corrupted queue files an issue and does not research", async () => {
  const issues = [];
  let called = false;
  const result = await runResearch({
    config,
    key: "present",
    queueText: "{",
    fileIssue: async (issue) => issues.push(issue),
    complete: async () => {
      called = true;
      return "";
    },
  });
  assert.equal(result.exitCode, 1);
  assert.equal(result.issueFiled, true);
  assert.equal(issues.length, 1);
  assert.match(issues[0].title, /corrupted queue/);
  assert.equal(called, false);
  assert.equal(result.openedPr, false);
});

test("variant check holds out containment, register id, and town-plus-word", () => {
  const park = { state: "KY", title: "Mammoth Cave National Park", stableName: "Mammoth Cave National Park", slug: "KY-mammoth-cave-national-park", town: "Mammoth Cave", registerId: "" };
  const containment = suspectDuplicate(item({ name: "Mammoth Cave", town: "Mammoth Cave", state: "KY", anchorPosture: "verified open" }), [park]);
  assert.equal(containment.reason, "name-containment");
  const otherTown = suspectDuplicate(item({ name: "Mammoth Cave", town: "Bowling Green", state: "KY" }), [park]);
  assert.equal(otherTown, null);
  const registered = suspectDuplicate(
    item({ name: "Pad observation", town: "Orlando", state: "FL", registerId: "73000568", anchorPosture: "verified open (fee)" }),
    [{ state: "FL", title: "Launch Complex 39", stableName: "Launch Complex 39", slug: "FL-launch-complex-39", town: "Titusville", registerId: "73000568" }],
  );
  assert.equal(registered.reason, "register-id");
  const sharedWord = suspectDuplicate(
    item({ name: "Pulaski Tunnel Overlook", town: "Wallace", state: "ID", anchorPosture: "Museum" }),
    [{ state: "ID", title: "Edward Pulaski Tunnel", stableName: "Edward Pulaski Tunnel", slug: "ID-edward-pulaski-tunnel", town: "Wallace", registerId: "" }],
  );
  assert.equal(sharedWord.reason, "town-and-distinctive-word");
});

test("a seeded live variant is held out and the next lead is filed", async () => {
  const opened = [];
  const result = await runResearch({
    config: { ...config, perRunCap: 2 },
    key: "present",
    queueText: queue([
      item({ name: "Mammoth Cave", town: "Mammoth Cave", state: "KY", anchorPosture: "verified open", row: 1 }),
      item({ name: "Published Already", town: "Fixture", state: "WY", queueState: "published", row: 2 }),
      readingLead(),
    ]),
    entries: [{ state: "KY", title: "Mammoth Cave National Park", stableName: "Mammoth Cave National Park", slug: "KY-mammoth-cave-national-park", town: "Mammoth Cave", registerId: "" }],
    openPr: async (pr) => opened.push(pr),
    complete: async () => dossier(),
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.report.duplicates.length, 1);
  assert.equal(result.report.duplicates[0].reason, "name-containment");
  assert.equal(result.report.taken.length, 1);
  assert.equal(result.report.filed.length, 1);
  assert.equal(opened.length, 1);
  assert.equal(opened[0].files[0].path, `corpus/HT-RES-${dossierSlug("WY", "Fixture Reading Yard")}.md`);
  assert.match(opened[0].body, /machine-filed research drafts/i);
  assert.equal(validateDossier(result.report.filed[0].markdown, { lead: readingLead() }).length, 0);
});

test("the cap comes from config", async () => {
  let calls = 0;
  const result = await runResearch({
    config: { ...config, perRunCap: 1 },
    key: "present",
    queueText: queue([
      item({ name: "Fixture Reading Yard", town: "Fixture", state: "WY", row: 1 }),
      item({ name: "Second Reading Yard", town: "Fixture", state: "WY", row: 2 }),
    ]),
    complete: async (request) => {
      calls += 1;
      const name = request.prompt.includes("Second Reading Yard") ? "Second Reading Yard" : "Fixture Reading Yard";
      return dossier({ name });
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.report.filed.length, 1);
});

test("a dossier that fails validation is not filed", async () => {
  const opened = [];
  const issues = [];
  const result = await runResearch({
    config,
    key: "present",
    queueText: queue([readingLead()]),
    openPr: async (pr) => opened.push(pr),
    fileIssue: async (issue) => issues.push(issue),
    complete: async () => "not a dossier",
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.openedPr, false);
  assert.equal(result.report.failures.length, 1);
  assert.equal(opened.length, 0);
  assert.equal(issues.length, 0);
  assert.match(result.summary, /produced nothing/);
});

test("checked dead is reported and not filed", async () => {
  const result = await runResearch({
    config,
    key: "present",
    queueText: queue([readingLead()]),
    complete: async () => "CHECKED-DEAD: no free source shows this ground.",
  });
  assert.equal(result.report.checkedDead.length, 1);
  assert.equal(result.openedPr, false);
  assert.match(result.report.checkedDead[0].reason, /no free source/);
});

test("a provider failure files an issue and does not open a pull request", async () => {
  const issues = [];
  const opened = [];
  const result = await runResearch({
    config,
    key: "present",
    queueText: queue([readingLead()]),
    fileIssue: async (issue) => issues.push(issue),
    openPr: async (pr) => opened.push(pr),
    complete: async () => {
      throw new Error("research provider returned 503");
    },
  });
  assert.equal(result.exitCode, 1);
  assert.equal(issues.length, 1);
  assert.equal(opened.length, 0);
  assert.doesNotMatch(issues[0].body, /present/);
});

test("validators reject a bad anchor, coordinates, a paywall, and a collision", () => {
  const lead = readingLead();
  assert.equal(validateDossier(dossier(), { lead }).length, 0);
  const routed = validateDossier(dossier({
    anchor: "Visitor center door",
    progression: "Walk in the front door.",
  }), { lead: item({ name: "Fixture Reading Yard", town: "Fixture", state: "WY", anchorPosture: "NONE" }) });
  assert.ok(routed.some((problem) => /reading/.test(problem)));
  const coordinates = validateDossier(dossier({ latitude: "44.000", longitude: "-110.000", coordinateSource: "one map" }), { lead });
  assert.ok(coordinates.some((problem) => /two independent/.test(problem)));
  const agreed = validateDossier(dossier({ latitude: "44.000", longitude: "-110.000", coordinateSource: "USGS and NPS agree" }), { lead });
  assert.equal(agreed.length, 0);
  const paywall = validateDossier(dossier({ sources: "1. https://www.jstor.org/stable/example" }), { lead });
  assert.ok(paywall.some((problem) => /free record|lead finder/.test(problem)));
  const collision = validateDossier(dossier(), {
    lead,
    entries: [{ state: "WY", title: "Fixture Reading Yard", stableName: "Fixture Reading Yard", slug: "WY-fixture-reading-yard", town: "Fixture", registerId: "" }],
  });
  assert.ok(collision.some((problem) => /collision/.test(problem)));
});

test("reflection ground cannot carry a route", () => {
  const lead = item({ name: "Example reflection", town: "Fixture", state: "WY", anchorPosture: "reflection" });
  assert.equal(requiresReading(lead), true);
  assert.equal(validateDossier(dossier({ name: "Example reflection" }), { lead }).length, 0);
  const routed = validateDossier(dossier({ name: "Example reflection", progression: "Follow the route to the marker. This is a reading." }), { lead });
  assert.ok(routed.some((problem) => /reflection/.test(problem)));
});

test("the publish branch cannot be main", () => {
  assert.throws(() => assertRunBranch("main"), /refusing/);
  assert.throws(() => assertRunBranch("master"), /refusing/);
  assert.doesNotThrow(() => assertRunBranch("machine/research-run-20"));
});

test("a live dossier still yields a stable name for the variant check", () => {
  const path = join(repoRoot, "corpus", "HT-RES-AL-noccalula-falls-pioneer-village.md");
  const entry = entryFromDossier(path, readFileSync(path, "utf8"));
  assert.equal(entry.state, "AL");
  assert.equal(entry.stableName, "Noccalula Falls Park and Pioneer Village");
});

test("a lead already filed on an open run is skipped and does not use the cap", async () => {
  const first = readingLead();
  const second = item({ name: "Second Reading Yard", town: "Fixture", state: "WY", row: 2 });
  let calls = 0;
  const result = await runResearch({
    config: { ...config, perRunCap: 1 },
    key: "present",
    queueText: queue([first, second]),
    skipIds: [first.id],
    complete: async () => {
      calls += 1;
      return dossier({ name: "Second Reading Yard" });
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.report.alreadyFiled.length, 1);
  assert.equal(result.report.alreadyFiled[0].id, first.id);
  assert.equal(result.report.taken.length, 1);
  assert.equal(result.report.filed.length, 1);
  assert.deepEqual(leadIdsInReport(renderReport(result.report)), [result.report.filed[0].id]);
});

test("open research runs supply skip ids and drafted ground", () => {
  const markdown = dossier({ name: "Fixture Reading Yard" });
  const report = [
    "# Machine research run",
    "- lead: lq_0123456789abcdef path: corpus/HT-RES-WY-fixture-reading-yard.md",
  ].join("\n");
  const ground = groundFromOpenRuns([
    { headRefName: "main", files: [{ path: "corpus/HT-RES-WY-ignore.md" }] },
    {
      headRefName: "machine/research-run-9",
      files: [
        { path: "corpus/HT-RES-WY-fixture-reading-yard.md" },
        { path: "app/desk/machine-runs/RUN-9.md" },
        { path: "README.md" },
      ],
    },
  ], (path) => (path.endsWith("RUN-9.md") ? report : markdown));
  assert.deepEqual(ground.skipIds, ["lq_0123456789abcdef"]);
  assert.equal(ground.entries.length, 1);
  assert.equal(ground.entries[0].state, "WY");
  assert.equal(ground.entries[0].stableName, "Fixture Reading Yard");
  assert.deepEqual(ground.slugs, ["WY-fixture-reading-yard"]);
  assert.deepEqual(ground.problems, []);
  const broken = groundFromOpenRuns([
    { headRefName: "machine/research-run-10", files: ["corpus/HT-RES-WY-missing.md"] },
  ], () => {
    throw new Error("missing");
  });
  assert.equal(broken.entries.length, 0);
  assert.match(broken.problems[0], /missing/);
});
