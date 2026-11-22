import assert from "node:assert/strict";
import test from "node:test";
import { findAnchor, huntStart } from "../lib/hunt-start.mjs";

const find = (n, tiedSlug, status = "active") => ({ n, tiedSlug, status, label: `Object ${n}` });
const prep = find(1, null);
const first = find(2, "same-site");
const second = find(3, "same-site");
const held = find(4, "other-site", "draft");
const ordered = [held, second, first, prep];
const check = (f, coords = true) => ({
  site_slug: f.tiedSlug, find_label: f.label,
  claim_lat: coords ? 40 : null, claim_lon: coords ? -76 : null,
});

test("public first clue is the first numbered active tied find, not the untied or held row", () => {
  assert.deepEqual(huntStart(ordered, null, true), { kind: "start", find: first });
  assert.equal(findAnchor(first.n), "find-2");
  assert.deepEqual(ordered, [held, second, first, prep]);
});

test("existing check-ins resume at the next exact distinct find on shared ground", () => {
  assert.deepEqual(huntStart(ordered, [check(first)], true), { kind: "resume", find: second });
  assert.deepEqual(huntStart(ordered, [check(second)], true), { kind: "resume", find: first });
});

test("scrapbook-only or unrelated rows are not a substitute for existing progress", () => {
  assert.deepEqual(huntStart(ordered, [check(first, false), check(find(8, "another")), check(held)], true),
    { kind: "start", find: first });
});

test("completed, in-preparation, and inactive hunts show read-only navigation", () => {
  assert.deepEqual(huntStart(ordered, [check(first), check(second)], true), { kind: "complete", find: null });
  assert.deepEqual(huntStart([prep, held], [], true), { kind: "browse", find: null });
  assert.deepEqual(huntStart(ordered, [check(first)], false), { kind: "browse", find: null });
});
