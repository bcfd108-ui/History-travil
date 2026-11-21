// node --test scripts/machine-queue.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  PHOTO_PENDING,
  assembleResearchQueue,
  buildQueues,
  parseCheckedDate,
  parseCsv,
  photoDocument,
  parseSourceText,
  schemaProblems,
  stableStringify,
} from "../lib/machine-queue.mjs";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function table(headers, rows) {
  const line = `| ${headers.join(" | ")} |`;
  const rule = `|${headers.map(() => "---").join("|")}|`;
  const body = rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
  return `${line}\n${rule}\n${body}\n`;
}

test("deterministic rebuild is byte-identical", () => {
  const first = buildQueues(appRoot);
  const second = buildQueues(appRoot);
  assert.equal(stableStringify(first), stableStringify(second));
  assert.equal(schemaProblems(first).length, 0);
});

test("a corrupted queue fails the check", () => {
  const path = join(appRoot, "data", "machine", "research-queue.json");
  const original = readFileSync(path, "utf8");
  const corrupt = original.replace('"kind": "research"', '"kind": "corrupt"');
  assert.notEqual(original, corrupt);
  writeFileSync(path, corrupt);
  const script = join(appRoot, "scripts", "check-machine-queue.mjs");
  try {
    const failed = spawnSync(process.execPath, [script], { encoding: "utf8" });
    assert.notEqual(failed.status, 0);
    assert.match(failed.stderr, /MACHINE QUEUE CHECK FAILED/);
    assert.match(failed.stderr, /does not match its sources/);
  } finally {
    writeFileSync(path, original);
  }
  const restored = spawnSync(process.execPath, [script], { encoding: "utf8" });
  assert.equal(restored.status, 0, restored.stderr);
});

test("HAVE rows never become queue items", () => {
  const file = "LEAD-SHEET-AL-2026-11-21-r2.md";
  const text = table(
    ["Place", "Town, County", "Anchor", "Family", "Visitation tier & evidence signal", "Source trail", "Flags"],
    [
      ["**HAVE — Selma to Montgomery National Historic Trail**", "Selma, Dallas County", "**verified open**", "Routes", "**Tier 1**", "https://www.nps.gov/semo/", "HAVE (`AL-TN-KY-first-sweep.md`)"],
      ["Julia Tutwiler Prison for Women", "Wetumpka, Elmore County", "**NONE**", "Prisons", "**Tier 4**", "https://example.test", "NO-ANCHOR"],
    ],
  );
  const rows = parseSourceText(file, text);
  const { items } = assembleResearchQueue(rows);
  assert.equal(items.length, 1);
  assert.equal(items[0].name, "Julia Tutwiler Prison for Women");
  assert.equal(items[0].queueState, "queued");
  assert.equal(items.some((item) => /selma to montgomery/i.test(item.name)), false);
});

test("duplicates across sheets collapse and keep every source", () => {
  const headers = ["Place", "Town, County", "Anchor", "Family", "Visitation tier & evidence signal", "Source trail", "Flags"];
  const left = parseSourceText(
    "LEAD-SHEET-AL-2026-11-21-r2.md",
    table(headers, [["Coffee County Courthouse", "Elba, Coffee County", "**exterior only**", "Government", "**Tier 3**", "nps", ""]]),
  );
  const right = parseSourceText(
    "LEAD-SHEET-AL-TN-KY-2026-11-21.md",
    "## Coffee County, Alabama\n\n" + table(
      ["Place", "Town, County", "Anchor and status", "Family", "Visitation tier and evidence signal", "Source trail", "Flags"],
      [["Coffee County Courthouse", "Elba, Coffee County", "**exterior only**", "Government", "3 · city stop", "nps", ""]],
    ),
  );
  const { items } = assembleResearchQueue([...left, ...right]);
  assert.equal(items.length, 1);
  assert.deepEqual(items[0].sources.map((source) => source.file).sort(), [
    "LEAD-SHEET-AL-2026-11-21-r2.md",
    "LEAD-SHEET-AL-TN-KY-2026-11-21.md",
  ]);
});

test("a known live entry reconciles to published", () => {
  const rows = parseSourceText(
    "MS-first-sweep.md",
    "# MISSISSIPPI\n\n" + table(
      ["Candidate", "Location", "Mark", "Likely anchor / note"],
      [["Old Courthouse Museum", "Vicksburg, Warren County", "LEAD", "Museum"]],
    ),
  );
  const { items } = assembleResearchQueue(rows, {
    liveEntries: [{ slug: "MS-old-court-house-museum", title: "Old Courthouse Museum", stableName: "Old Courthouse Museum", town: "Vicksburg", state: "MS" }],
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].queueState, "published");
  assert.equal(items[0].targetSlug, "MS-old-court-house-museum");
});

test("a corpus dossier absent from the live catalog reconciles to filed", () => {
  const rows = parseSourceText(
    "LA-completion-sweep.md",
    "# LOUISIANA\n\n" + table(
      ["Candidate", "Location", "Mark", "Likely anchor / note"],
      [["Old Ursuline Convent", "New Orleans", "LEAD", "Museum"]],
    ),
  );
  const { items } = assembleResearchQueue(rows, {
    corpusOnlyEntries: [{ slug: "LA-old-ursuline-convent", title: "Old Ursuline Convent", stableName: "", town: "New Orleans", state: "LA" }],
  });
  assert.equal(items[0].queueState, "filed");
  assert.equal(items[0].targetSlug, "LA-old-ursuline-convent");
});

test("a Georgia county named Washington stays Georgia", () => {
  const rows = parseSourceText(
    "LEAD-SHEET-GA-2026-11-21-Wave-3-Closeout.md",
    "### Washington (4 federal intake rows closed)\n" + table(
      ["Lead and ground", "Family", "Tier and signal", "Public anchor and boundary", "Free evidence"],
      [["**Johnson, James E., House** · Sandersville · ID 94000711", "Architecture", "4 · local", "**NONE**", "nps"]],
    ),
  );
  assert.equal(rows[0].state, "GA");
  assert.equal(rows[0].county, "Washington");
  assert.equal(rows[0].registerId, "94000711");
});

test("checked-dead and held marks are kept, and XREF does not queue", () => {
  const rows = parseSourceText(
    "AK-first-sweep.md",
    table(
      ["Candidate", "Location", "Mark", "Note"],
      [
        ["Aniakchak", "Alaska Peninsula", "OUT-OF-SCOPE-FOR-NOW", "fly-in"],
        ["Already listed jail", "Juneau", "LISTED", "see the other sweep"],
      ],
    ),
  );
  const dead = parseSourceText(
    "LEAD-SHEET-FL-2026-11-21-Wave-3.md",
    table(
      ["Place", "Town, County", "Anchor + status", "Family", "Tier + evidence signal", "Source trail", "Flags"],
      [
        ["**Santa Rosa Hotel** · NR 100000957", "Sebring, Highlands", "**checked dead lead**", "Architecture", "—", "news", "DEAD (checked 2026-11-21)"],
        ["**Highlands County Courthouse** · NR 89001013", "Sebring, Highlands", "see Wave 1 Part 1 row", "Courts", "—", "wave 1", "XREF (PART-1)"],
      ],
    ),
  );
  const { items } = assembleResearchQueue([...rows, ...dead]);
  const byName = Object.fromEntries(items.map((item) => [item.name, item.queueState]));
  assert.equal(byName.Aniakchak, "held");
  assert.equal(byName["Santa Rosa Hotel"], "checked-dead");
  assert.equal(byName["Highlands County Courthouse"], undefined);
  assert.equal(byName["Already listed jail"], undefined);
});

test("seeding is tier then march, and depth follows the march", () => {
  const row = (file, state, name, tier) => parseSourceText(file, [
    `# ${state}`,
    table(
      ["Candidate", "Location", "Mark", "Likely anchor / note"],
      [[name, "Town", "LEAD", `Tier ${tier}`]],
    ),
  ].join("\n"));
  // Tier lives in the note column here, so set it with a finder tier column instead.
  const finder = (file, stateHeading, name, tier) => parseSourceText(file, `${stateHeading}\n` + table(
    ["Place", "Town, County", "Anchor", "Family", "Visitation tier & evidence signal", "Source trail", "Flags"],
    [[name, "Town, Example County", "verified open", "Family", `**Tier ${tier}**`, "src", ""]],
  ));
  const rows = [
    ...finder("GA-sheet.md", "# GEORGIA", "Georgia Tier One", 1),
    ...finder("AL-sheet.md", "# ALABAMA", "Alabama Tier Two", 2),
    ...finder("AL-sheet.md", "# ALABAMA", "Alabama Tier One", 1),
    ...finder("LA-sheet.md", "# LOUISIANA", "Louisiana Tier One", 1),
  ];
  const { items } = assembleResearchQueue(rows, {
    liveEntries: [{ slug: "LA-live", title: "Some Other Live Place", stableName: "", town: "Baton Rouge", state: "LA" }],
  });
  assert.deepEqual(items.map((item) => item.name), [
    "Alabama Tier One",
    "Georgia Tier One",
    "Alabama Tier Two",
    "Louisiana Tier One",
  ]);
});

test("parsers for each manifest dialect", () => {
  const cases = [
    {
      dialect: "finder-canonical-7",
      file: "LEAD-SHEET-AL-2026-11-21-r2.md",
      text: table(
        ["Place", "Town, County", "Anchor", "Family", "Visitation tier & evidence signal", "Source trail", "Flags"],
        [["Old Tuscaloosa County Jail", "Tuscaloosa, Tuscaloosa County", "**exterior only**", "Prisons", "**Tier 4** — NO SIGNAL", "nps", ""]],
      ),
      name: "Old Tuscaloosa County Jail",
      town: "Tuscaloosa",
      tier: 4,
    },
    {
      dialect: "finder-anchor-and-status-7",
      file: "LEAD-SHEET-AL-TN-KY-2026-11-21.md",
      text: "## Coffee County, Alabama\n" + table(
        ["Place", "Town, County", "Anchor and status", "Family", "Visitation tier and evidence signal", "Source trail", "Flags"],
        [["Rawls Hotel", "Enterprise, Coffee County", "**exterior only**", "Railroad", "3 · local", "nps", ""]],
      ),
      name: "Rawls Hotel",
      town: "Enterprise",
      state: "AL",
      tier: 3,
    },
    {
      dialect: "finder-fl-wave2-6",
      file: "LEAD-SHEET-FL-2026-11-21-Wave-2.md",
      text: table(
        ["Place / Town, County", "Anchor + status", "Family", "Visitation tier + signal", "Source trail", "Flags"],
        [["**Aladdin Theater** · Cocoa, Brevard Co. · ID 91001541", "**verified open**", "Architecture", "3 · Local NRHP", "nps", "—"]],
      ),
      name: "Aladdin Theater",
      town: "Cocoa",
      county: "Brevard",
      tier: 3,
    },
    {
      dialect: "finder-fl-wave3-7",
      file: "LEAD-SHEET-FL-2026-11-21-Wave-3.md",
      text: table(
        ["Place", "Town, County", "Anchor + status", "Family", "Tier + evidence signal", "Source trail", "Flags"],
        [["**Archbold Biological Station at Red Hill** · NR 07000698", "Venus, Highlands", "**verified open**", "Science", "3 · signal", "nps", "—"]],
      ),
      name: "Archbold Biological Station at Red Hill",
      town: "Venus",
      tier: 3,
    },
    {
      dialect: "finder-fl-wave3-8",
      file: "LEAD-SHEET-FL-2026-11-21-Wave-3.md",
      text: table(
        ["Place", "Town, County", "Anchor + status", "Family", "Tier + evidence signal", "Source trail", "Flags", "Register status"],
        [["**State Marker Example**", "LaBelle, Hendry", "**exterior only**", "Markers", "4 · NO SIGNAL", "nps", "—", "state"]],
      ),
      name: "State Marker Example",
      town: "LaBelle",
    },
    {
      dialect: "finder-lead-ground-4",
      file: "LEAD-SHEET-GA-2026-11-21-Wave-2.md",
      text: "### Appling\n" + table(
        ["Lead and ground", "Tier and signal", "Public anchor and boundary", "Free evidence"],
        [["**Appling County Courthouse** · Baxley · Courts · ID 80000965", "3 · state level", "**exterior only** · public frontage", "nps"]],
      ),
      name: "Appling County Courthouse",
      town: "Baxley",
      county: "Appling",
      tier: 3,
    },
    {
      dialect: "finder-lead-ground-5",
      file: "LEAD-SHEET-GA-2026-11-21-Wave-3-Closeout.md",
      text: "### Bartow (18 federal intake rows closed)\n" + table(
        ["Lead and ground", "Family", "Tier and signal", "Public anchor and boundary", "Free evidence"],
        [["**Adairsville Historic District** · Adairsville · ID 87002043", "Architecture", "3 · downtown", "**verified open**", "nps"]],
      ),
      name: "Adairsville Historic District",
      town: "Adairsville",
      county: "Bartow",
    },
    {
      dialect: "finder-lead-ground-6",
      file: "LEAD-SHEET-FL-2026-11-21.md",
      text: table(
        ["Lead and ground", "Family", "Tier & signal", "Public anchor & boundary", "Free evidence", "Flags"],
        [["**Old Baker County Courthouse** · Macclenny · ID 86001729", "Courts", "4 · local", "**exterior only**", "nps", "—"]],
      ),
      name: "Old Baker County Courthouse",
      town: "Macclenny",
      tier: 4,
    },
    {
      dialect: "finder-place-county-7",
      file: "LEAD-SHEET-FL-2026-11-21.md",
      text: table(
        ["Place", "County", "Family", "Tier & signal", "Public anchor & boundary", "Free evidence", "Flags"],
        [["**Old Calhoun County Courthouse** · Blountstown · ID 80000943", "Calhoun", "Courts", "4 · local", "**exterior only**", "nps", "—"]],
      ),
      name: "Old Calhoun County Courthouse",
      town: "Blountstown",
      county: "Calhoun",
    },
    {
      dialect: "finder-register-reconciliation-6",
      file: "LEAD-SHEET-GA-2026-11-21-Wave-3-Closeout.md",
      text: table(
        ["Place", "Town, County", "Family", "Tier & signal", "Public anchor & conflict status", "Free evidence"],
        [["**First National Bank Building**", "Atlanta, Fulton County", "Architecture", "3 · agenda", "**exterior only**", "nps"]],
      ),
      name: "First National Bank Building",
      town: "Atlanta",
      tier: 3,
    },
    {
      dialect: "finder-fort-campbell-4",
      file: "LEAD-SHEET-TN-2026-11-21-Fort-Campbell.md",
      text: table(
        ["Lead", "Public anchor", "Tier and signal", "Evidence and disposition"],
        [["Wings of Liberty Museum", "verified open", "Tier 3", "absorbed into TN r2"]],
      ),
      name: "Wings of Liberty Museum",
      tier: 3,
      state: "TN",
    },
    {
      dialect: "finder-access-audit-5",
      file: "LEAD-SHEET-FL-2026-11-21.md",
      text: table(
        ["Ground", "Location", "2025 NPS IRMA / Signal", "Lawful Public Access & Named Operator / Closure Status (`2026-11-21`)", "Free Evidence"],
        [["**Dry Tortugas NP / Fort Jefferson**", "Monroe County", "**Tier 1** — 89,355 visits", "**verified open (water/air-gated)**", "nps"]],
      ),
      name: "Dry Tortugas NP / Fort Jefferson",
      county: "Monroe",
      tier: 1,
    },
    {
      dialect: "finder-existing-lead-2",
      file: "LEAD-SHEET-FL-2026-11-21.md",
      text: table(
        ["Existing lead", "Evidence for the Stringer and access ruling"],
        [["Windover Archeological Site, NR 87000810", "**verified open**, off-site only"]],
      ),
      expectRole: "xref",
      name: "Windover Archeological Site",
    },
    {
      dialect: "finder-summary",
      file: "LEAD-SHEET-GA-2026-11-21-Wave-2.md",
      text: table(
        ["Filing", "New", "Live HAVE this wave", "Verified open", "Exterior only", "Seasonal", "NONE", "Tier 1", "Tier 2", "Tier 3", "Tier 4"],
        [["Georgia Wave 2", "237", "0", "19", "74", "2", "142", "0", "10", "154", "73"]],
      ),
      expectNone: true,
    },
    {
      dialect: "desk-sweep-4",
      file: "AL-TN-KY-first-sweep.md",
      text: "# ALABAMA\n" + table(
        ["Candidate", "Location", "Mark", "Likely anchor / note"],
        [["Russell Cave National Monument", "Bridgeport, Jackson County", "LEAD", "National park unit"]],
      ),
      name: "Russell Cave National Monument",
      town: "Bridgeport",
      county: "Jackson",
      state: "AL",
    },
    {
      dialect: "desk-sweep-4",
      file: "AK-first-sweep.md",
      text: table(
        ["Candidate", "Location", "Mark", "Note"],
        [["Denali Visitor Center", "Denali Park", "LEAD", "road system"]],
      ),
      name: "Denali Visitor Center",
      state: "AK",
    },
    {
      dialect: "desk-sweep-4",
      file: "haunted-leads-sweep.md",
      text: "## Louisiana (38)\n" + table(
        ["Candidate", "Location", "Mark", "Ground / anchor / source"],
        [["Old Ursuline Convent", "New Orleans", "LEAD", "Chartres Street"]],
      ),
      name: "Old Ursuline Convent",
      state: "LA",
    },
    {
      dialect: "desk-sweep-4",
      file: "HT-SWEEP-ID-THEME-SWEEP.md",
      text: table(
        ["Candidate", "Location", "Mark", "Reason & lead source"],
        [["Old Idaho Penitentiary", "Boise", "LEAD", "state historic site"]],
      ),
      name: "Old Idaho Penitentiary",
      state: "ID",
    },
    {
      dialect: "csv-fl-register-11",
      file: "FL-2026-11-21-County-Register-Control-r2.csv",
      text: "county,ref,property,city,disposition_bucket,anchor,tier,family,flags,county_status,wave\nBrevard,91001541,Aladdin Theater,Cocoa,verified open,verified open (ticketed),3,Architecture,—,CLOSED,Wave 2\n",
      name: "Aladdin Theater",
      town: "Cocoa",
      county: "Brevard",
      tier: 3,
      state: "FL",
    },
    {
      dialect: "csv-ga-register-11",
      file: "GA-2026-11-21-County-Register-Control-r2.csv",
      text: "County,Reference as printed,Property / record name,Record type,Source,Georgia Register evidence,Finder disposition,Linked lead ID or next action,Additional source,Live collision,Checked UTC\nAppling,80000965,Appling County Courthouse,Multiple,https://npgallery.nps.gov/AssetDetail/NRIS/80000965,listed,Wave 2 new lead or linked component,80000965,,No live Georgia ground,2026-11-21T10:17:32Z\n",
      name: "Appling County Courthouse",
      county: "Appling",
      state: "GA",
    },
  ];

  for (const sample of cases) {
    const parsed = parseSourceText(sample.file, sample.text);
    const lead = parsed.find((row) => row.role !== "summary" && row.role !== "skip") || parsed[0];
    assert.equal(lead.dialect, sample.dialect, sample.dialect);
    if (sample.expectNone) {
      assert.equal(lead.role, "summary");
      continue;
    }
    assert.equal(lead.name, sample.name, sample.dialect);
    if (sample.town) assert.equal(lead.town, sample.town, sample.dialect);
    if (sample.county) assert.equal(lead.county, sample.county, sample.dialect);
    if (sample.tier) assert.equal(lead.tier, sample.tier, sample.dialect);
    if (sample.state) assert.equal(lead.state, sample.state, sample.dialect);
    if (sample.expectRole) assert.equal(lead.role, sample.expectRole, sample.dialect);
  }
});

test("verification dates parse and unrecorded sorts first", () => {
  assert.equal(parseCheckedDate("Checked Nov. 20, 2026 Pacific."), "2026-11-20");
  assert.equal(parseCheckedDate("Checked November 19, 2026 UTC"), "2026-11-19");
  assert.equal(parseCheckedDate("Checked 19 November 2026"), "2026-11-19");
  assert.equal(parseCheckedDate("Checked 2026-11-18"), "2026-11-18");
  assert.equal(parseCheckedDate("No date here"), null);
});

test("photo queue stays pending when its source is missing", () => {
  const photo = photoDocument(null, null);
  assert.equal(photo.status, PHOTO_PENDING);
  assert.equal(photo.source, null);
  assert.equal(photo.counts.items, 0);
  assert.deepEqual(photo.items, []);
});

test("a quoted photo CSV preserves punctuation, line breaks and blank access cells", () => {
  const csv = 'Slug,Entry,Note,Access decision\r\na,"Depot, ""east""","Line 1\r\nLine 2",\r\n';
  const photo = photoDocument(csv, "fixture.csv");
  assert.deepEqual(photo.items, [{
    Slug: "a", Entry: 'Depot, "east"', Note: "Line 1\r\nLine 2", "Access decision": "",
  }]);
});

test("the generated photo queue mirrors the canonical gap report and its field restrictions", () => {
  const { photo } = buildQueues(appRoot);
  assert.equal(photo.status, "ready");
  assert.equal(photo.source, "app/public/desk/photo-gaps.csv");

  const readReport = name => readFileSync(join(appRoot, "public", "desk", name), "utf8");
  const [headers, ...rows] = parseCsv(readReport("photo-gaps.csv")).rows;
  assert.equal(photo.counts.items, rows.length);
  assert.equal(new Set(photo.items.map(item => item.Slug)).size, rows.length);
  assert.equal(new Set(photo.items.map(item => item["Entry ID"])).size, rows.length);
  for (const [index, row] of rows.entries()) {
    assert.deepEqual(Object.keys(photo.items[index]), headers);
    assert.deepEqual(Object.values(photo.items[index]), row);
  }

  const [fieldHeaders, ...fieldRows] = parseCsv(readReport("field-photo-targets.csv")).rows;
  const options = new Map(photo.items.filter(item =>
    item["Next desk or field action"].startsWith("Field option — ")
  ).map(item => [item.Slug, item]));
  assert.deepEqual(new Set(options.keys()), new Set(fieldRows.map(row => row[fieldHeaders.indexOf("Slug")])));
  for (const row of fieldRows) {
    const field = Object.fromEntries(fieldHeaders.map((key, index) => [key, row[index]]));
    const item = options.get(field.Slug);
    assert.equal(item["Entry ID"], field["Entry ID"]);
    assert.equal(item.Gap, field.Gap);
    assert.equal(item.Eligibility, "PUBLIC GROUND");
    assert.ok(["none", "then-only"].includes(item.Coverage));
    assert.ok(field["Public viewpoint or permitted subject"].trim());
    assert.equal(item["Next desk or field action"], "Field option — " + field["Public viewpoint or permitted subject"]);
  }
});

test("the real snapshot queues HAVE-free creators and keeps duplicate sources", () => {
  const queues = buildQueues(appRoot);
  for (const item of queues.research.items) {
    assert.ok(item.sources.some((source) => ["lead", "dead", "held"].includes(source.role)), item.name);
  }
  const dupes = queues.research.items.filter((item) => new Set(item.sources.map((source) => source.file)).size > 1);
  assert.ok(dupes.length > 0, "expected cross-sheet duplicates to collapse");
  const text = readFileSync(join(appRoot, "package.json"), "utf8");
  assert.match(text, /check-machine-queue\.mjs/);
});
