import { readFileSync } from "node:fs";
import { checkEntry, visitLabels } from "../lib/visit-facts.mjs";

const load = name => JSON.parse(readFileSync(new URL("../data/" + name + ".json", import.meta.url), "utf8"));
const sites = new Map(load("sites").map(site => [site.slug, site]));
const tops = load("plain-tops");
const facts = load("visit-facts");
for (const slug of new Set([...Object.keys(tops), ...Object.keys(facts)])) {
  const site = sites.get(slug);
  const issues = site && facts[slug] ? checkEntry(site, facts[slug], tops[slug]) : ["missing entry or visit-facts record"];
  if (issues.length) {
    console.error(slug, issues.join(", "));
    process.exitCode = 1;
  }
}
if (!process.exitCode) console.log("Entry review:", Object.keys(facts).length, "checked of", sites.size, "entries.");

// Desk output for a state batch. Pass a state code to restrict the report.
if (!process.exitCode && process.argv.includes("--report")) {
  const state = process.argv.find(arg => /^[A-Z]{2}$/.test(arg));
  for (const [slug, record] of Object.entries(facts)) {
    if (state && sites.get(slug).stateCode !== state) continue;
    console.log("\n### " + slug + "\n\n| Label | Reviewed value | Source field |\n|---|---|---|");
    const selections = Object.entries(visitLabels).filter(([key]) => record.rows[key])
      .map(([key, label]) => [label, record.rows[key]]);
    if (record.warning) selections.unshift(["Hard warning", record.warning]);
    for (const [label, field] of selections)
      console.log("| " + label + " | " + field.value.replaceAll("|", "\\|") + " | " + field.from.map(x => "`" + x + "`").join(", ") + " |");
  }
}
