import test from "node:test";
import assert from "node:assert/strict";
import { checkNyPhotoAdvisory } from "./photo-ny-seed-license.mjs";

const approved = {
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Santanoni_Preserve_-_Main_Lodge.jpg",
  license: "CC BY-SA 3.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
  credit: "Mwanner at English Wikipedia · Lossless WebP conversion by On Old Ground; no crop or resize",
  year: null,
};
test("Santanoni requires the exact work, license, author credit and no inferred date", () => {
  assert.equal(checkNyPhotoAdvisory("NY-camp-santanoni", approved), true);
  for (const [key, val] of Object.entries({year: 2008, dateNote: "2009", credit: "", license: "CC BY-SA 4.0", sourceUrl:"https://example.com/photo"})) {
    assert.equal(checkNyPhotoAdvisory("NY-camp-santanoni", {...approved, [key]: val}), false);
  }
});
test("reviewed New York advisories cannot apply to a different item or a different slug", () => {
  const photo={ sourceUrl:"https://www.loc.gov/pictures/item/2016794140/",license:"No known restrictions on publication." };
  assert.equal(checkNyPhotoAdvisory("NY-niagara-reservation", photo), true);
  assert.equal(checkNyPhotoAdvisory("NY-niagara-reservation", {...photo, sourceUrl:"https://www.loc.gov/item/other/"}), false);
  assert.equal(checkNyPhotoAdvisory("unreviewed", photo), undefined);
});
