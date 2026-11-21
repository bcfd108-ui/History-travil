import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { checkEntry } from "../lib/visit-facts.mjs";

const read = name => JSON.parse(readFileSync(new URL("../data/" + name + ".json", import.meta.url), "utf8"));
const sites = read("sites");
const slug = "AZ-bisbee-deportation-reflection";
const site = sites.find(item => item.slug === slug);
const top = read("plain-tops")[slug];
const facts = read("visit-facts")[slug];

test("a verified row belongs to exactly one slug and one set of passages", () => {
  assert.deepEqual(checkEntry(site, facts, top), []);
  assert.ok(checkEntry({ ...site, slug: "other-place" }, facts, top).length);
  assert.ok(checkEntry({ ...site, access: site.access.replace("$12", "$20") }, facts, top).length);
  assert.ok(checkEntry({ ...site, sources: "" }, facts, top).length);
});

test("edited admission text or an unrelated website cannot inherit a review", () => {
  const altered = structuredClone(facts);
  altered.rows.admission.value = "Free";
  altered.rows.website.value = "https://example.org/";
  const issues = checkEntry(site, altered, top);
  assert.ok(issues.includes("edited copy or slug needs review"));
  assert.ok(issues.includes("website missing from the recorded sources"));
});
