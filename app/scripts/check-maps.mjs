// Build-time check for the historic map library (runs in `npm run build`).
// Fails the build on: a tie to a missing entry/route/sheet; a point on a
// tie that is not "checked"; a checked tie without a 0–100% position; an
// image on an unstable host; a pending sheet not flagged as such; a point
// on a tie the round-1 checks took off; or any drift in the Boone records
// against the frozen v1 file (data/historic-maps.json).
// Prints the computed counts so the build log carries the hand-countable
// numbers.
import { readFileSync, existsSync } from "node:fs";
import { checkLibrary, libraryCounts } from "../lib/maps-core.mjs";

const data = new URL("../data/", import.meta.url);
const read = (n) => JSON.parse(readFileSync(new URL(n, data), "utf8"));
const library = read("historic-map-library.json");
const sites = new Set(read("sites.json").map((s) => s.slug));
const tours = new Set(read("tours.json").map((t) => t.id));
const v1 = existsSync(new URL("historic-maps.json", data)) ? read("historic-maps.json") : null;

const c = libraryCounts(library);
console.log(
  `maps: library v${library.version} — ${c.sheets} sheets (${c.pending} pending conversion), ${c.places} places in ${c.states} states; ${c.ties} ties: ${c.points} with a checked point, ${c.noPoint} without`,
);
const problems = checkLibrary(library, sites, tours, v1);
if (problems.length) {
  console.error("Map library check FAILED:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`maps: check passed${v1 ? " — Boone/v1 records rebuild field-for-field" : ""}`);
