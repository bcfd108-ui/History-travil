// node --test scripts/maps-core.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkLibrary, libraryCounts, tiesFor, toV1 } from "../lib/maps-core.mjs";

const lib = JSON.parse(readFileSync(new URL("../data/historic-map-library.json", import.meta.url), "utf8"));
const v1 = JSON.parse(readFileSync(new URL("../data/historic-maps.json", import.meta.url), "utf8"));
const sites = new Set(lib.ties.filter((t) => t.entryKind === "site").map((t) => t.entrySlug));
const tours = new Set(lib.ties.filter((t) => t.entryKind === "tour").map((t) => t.entrySlug));
const clone = () => JSON.parse(JSON.stringify(lib));

test("library passes as filed", () => assert.deepEqual(checkLibrary(lib, sites, tours, v1), []));

test("counts", () => {
  const c = libraryCounts(lib);
  assert.equal(c.ties, c.points + c.noPoint);
});

test("Boone rebuilds field-for-field on both keys, no point", () => {
  for (const key of Object.keys(v1)) {
    const [{ tie, sheet }] = tiesFor(lib, key);
    assert.equal(tie.position, null);
    assert.deepEqual(toV1(tie, sheet), v1[key]);
  }
});

test("a point on a non-checked tie fails", () => {
  const l = clone();
  l.ties.find((t) => t.status === "no-point-by-rule").position = { x: 1, y: 1 };
  assert.ok(checkLibrary(l, sites, tours, v1).some((p) => /no-point tie carries a position/.test(p)));
});

test("a held-off point fails", () => {
  const l = clone();
  const t = l.ties.find((t) => t.entrySlug === "MS-house-on-ellicott-hill");
  t.status = "checked";
  t.position = { x: 50, y: 50 };
  assert.ok(checkLibrary(l, sites, tours, v1).some((p) => /taken off in round 1/.test(p)));
});

test("an image on an unstable host fails", () => {
  const l = clone();
  l.sheets[1].image.src = "https://example-temp-host.test/x.jpg";
  assert.ok(checkLibrary(l, sites, tours, v1).some((p) => /not a stable/.test(p)));
});

test("status 'placed' is not renderable", () => {
  const l = clone();
  l.ties[0].status = "placed";
  assert.ok(checkLibrary(l, sites, tours, v1).some((p) => /not renderable/.test(p)));
});

test("pending-conversion-upload with a display src fails", () => {
  const l = clone();
  const sg = l.sheets.find((x) => x.id === "mo-weingarten-usgs-1909");
  sg.image.src = "https://upload.wikimedia.org/wikipedia/commons/x.jpg";
  sg.image.status = "pending-conversion-upload";
  assert.ok(checkLibrary(l, sites, tours, v1).some((p) => /pending-conversion-upload but image.src is set/.test(p)));
});

test("a source.sourceFiles URL used as image.src fails", () => {
  const l = clone();
  const sg = l.sheets.find((x) => x.id === "mo-weingarten-usgs-1909");
  const geotiff = sg.source.sourceFiles && sg.source.sourceFiles.geotiff;
  assert.ok(geotiff);
  delete sg.image.status;
  sg.image.displayDerivativeNeeded = false;
  sg.image.src = geotiff;
  assert.ok(checkLibrary(l, sites, tours, v1).some((p) => /must not be a source.sourceFiles URL/.test(p)));
});
