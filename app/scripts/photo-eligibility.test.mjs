import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { accessRevision, archiveGap, photoEligibility } from "./photo-eligibility.mjs";

const load = path => readFileSync(new URL(path, import.meta.url), "utf8");
const sites = JSON.parse(load("../data/sites.json"));
const findings = JSON.parse(load("../data/photo-search.json"));

// The two identity cells are always machine-generated, single-line ID and slug.
const slugsIn = csv => new Set([...csv.matchAll(/^"HT-[^"]+","([^"]+)",/gm)].map(match => match[1]));
const field = slugsIn(load("../public/desk/field-photo-targets.csv"));
const gaps = load("../public/desk/photo-gaps.csv");

test("every field target has a current reviewed viewpoint and needs a current image", () => {
  const expected = sites.filter(site => photoEligibility(site, findings[site.slug]) === "PUBLIC GROUND"
    && !site.photos.some(p => p.eraRole === "now"));
  assert.deepEqual(field, new Set(expected.map(site => site.slug)));
  for (const site of sites.filter(site => site.photoEligibility === "ARCHIVAL-ONLY")) {
    assert.ok(!field.has(site.slug), site.slug);
    if (new Set(site.photos.map(p => p.eraRole)).size < 2)
      assert.ok(gaps.includes('"' + site.id + '","' + site.slug + '"'), site.slug);
  }
});
test("no-anchor filings stay off the field sheet, with named open ground kept eligible", () => {
  for (const slug of ["MS-riverside-hotel-clarksdale","ID-mountain-home-titan-i","MS-anna-site","bayhorse"]) {
    assert.equal(sites.find(s => s.slug === slug)?.photoEligibility, "ARCHIVAL-ONLY", slug);
    assert.ok(!field.has(slug));
  }
  assert.ok(gaps.includes(archiveGap));
  assert.ok(field.has("ID-sunshine-miners-memorial"));
  assert.ok(field.has("MS-kings-tavern-natchez"));
});
test("unknown, revised and conflicting access records cannot inherit a field invitation", () => {
  const site = {slug:"monument",access:"Roadside memorial.",locator:{extra:[]},stopType:"reflection"};
  const finding = {groundReview:{status:"PUBLIC GROUND",viewpoint:"Memorial plaza",revision:accessRevision(site)}};
  assert.equal(photoEligibility(site, finding),"PUBLIC GROUND");
  assert.equal(photoEligibility(site),"DESK REVIEW");
  assert.equal(photoEligibility({...site,access:"Approach unverified."},finding),"DESK REVIEW");
  for (const access of ["NO-ANCHOR research reading", "Appointment-only ground.", "Private property. No verified public viewpoint."])
    assert.equal(photoEligibility({...site,access},finding),"ARCHIVAL-ONLY");
});
