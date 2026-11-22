import test from "node:test";
import assert from "node:assert/strict";
import { hasApprovedPhotoLicense } from "./photo-license.mjs";

const fal = {
  license: "Free Art License 1.3",
  licenseUrl: "https://artlibre.org/licence/lal/en/",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:A421,_Centralia,_Pennsylvania,_USA,_Route_61,_abandoned_section_above_coal_mine_fire,_2016.jpg",
  credit: "Brian W. Schaller",
  modificationNote: "Losslessly converted to WebP by On Old Ground; no crop or resize.",
};

test("Centralia accepts only the owner-selected FAL with exact source, author, link and change disclosure", () => {
  assert.ok(hasApprovedPhotoLicense("PA-centralia", fal));
  for (const [key, bad] of Object.entries({
    license: "CC BY-NC-SA 4.0", credit: "", modificationNote: "",
    sourceUrl: "https://commons.wikimedia.org/wiki/Other",
    licenseUrl: "https://example.com",
  })) assert.equal(hasApprovedPhotoLicense("PA-centralia", { ...fal, [key]: bad }), false, key);
  assert.equal(hasApprovedPhotoLicense("PA-centralia", { ...fal, license: "Public domain" }), false);
  assert.equal(hasApprovedPhotoLicense("unreviewed", fal), false);
});

test("desk-reviewed LOC advisory is accepted only for the exact item, not as a generic rights license", () => {
  const photo = { sourceUrl: "https://www.loc.gov/item/2010649522/", license: "No known restrictions on publication." };
  assert.ok(hasApprovedPhotoLicense("PA-drake-well-titusville", photo));
  assert.equal(hasApprovedPhotoLicense("unreviewed", photo), false);
  assert.equal(hasApprovedPhotoLicense("PA-drake-well-titusville", { ...photo, sourceUrl: "https://www.loc.gov/item/other/" }), false);
  assert.ok(hasApprovedPhotoLicense("existing", { license: "CC BY-SA 4.0" }));
});
