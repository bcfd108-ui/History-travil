// Build-time check for the Hunts tab (runs in `npm run build`, after the
// converter regenerates data/sites.json). Fails the build when:
//   • a find would tie to REFLECTION ground (stopType "reflection" OR named
//     in REFLECTION_SLUG_DENYLIST / REFLECTION_APP_SITES, e.g. Sunshine);
//   • two catalog entries claim the same groundKey or unshared appSite;
//   • a hunt lacks theme/region, or names a theme not in data/hunt-themes.json;
//   • a hunt has duplicate find numbers, missing/duplicate groundKey, or a
//     find lacks label/task.
// Prints the computed counts so the build log carries the hand-countable
// numbers: hunts, finds, tied/total per hunt.
import { readFileSync } from "node:fs";
import { checkHunts, indexCatalog, resolveFind } from "../lib/hunts-core.mjs";

const data = new URL("../data/", import.meta.url);
const read = (n) => JSON.parse(readFileSync(new URL(n, data), "utf8"));
const hunts = read("hunts.json");
const sites = read("sites.json");
const themes = read("hunt-themes.json");

const problems = checkHunts(hunts, sites, themes);
const idx = indexCatalog(sites, hunts);
let finds = 0, tied = 0;
for (const h of hunts) {
  const r = h.finds.map((f) => ({ f, t: resolveFind(f, idx) }));
  const t = r.filter((x) => x.t.status === "tied").length;
  finds += r.length;
  tied += t;
  const viaNotes = r
    .filter((x) => x.t.status === "tied" && x.t.via !== "entrySlug")
    .map((x) => ` [find ${x.f.n} tied via ${x.t.via} → ${x.t.site.slug}]`)
    .join("");
  console.log(`hunts: ${h.slug} — ${t}/${r.length} tied${viaNotes}`);
}
console.log(`hunts: ${hunts.length} hunts, ${finds} finds, ${tied} tied, ${finds - tied} untied; catalog ${sites.length} entries`);
if (problems.length) {
  console.error("Hunts check FAILED:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("hunts: check passed — no find on reflection ground");
