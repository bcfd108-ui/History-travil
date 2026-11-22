import test from "node:test";
import assert from "node:assert/strict";
import * as title from "./entry-title.mjs";

const project = (raw, extra = {}) => title.entryDisplayTitle({ slug:"test", raw, hasHeading:true, ...extra });

test("ID-prefixed story uses its named source and retains the story as a dek", () => {
  assert.equal(typeof title.entryDisplayTitle,"function","Missing display title projection");
  assert.deepEqual(project("HT-RES-ID-pulaski — The trail to the tunnel", {
    stableName:"Pulaski Tunnel Trail — National Register listing: another name"
  }), { name:"Pulaski Tunnel Trail", dek:"The trail to the tunnel", basis:"stable record" });
});

test("already placed title leads and a real narrative remainder becomes the dek", () => {
  const p = project("Bayhorse: the town that had to feed its furnace");
  assert.deepEqual(p,{ name:"Bayhorse",dek:"the town that had to feed its furnace",basis:"source heading" });
});

test("does not invent from file keys, numbers or an alternative access anchor", () => {
  assert.deepEqual(project("AZ-opaque-key", {hasHeading:false,stableName:"",slug:"AZ-opaque-key"}),{name:"Catalog entry",dek:"",basis:"hold: no verified name"});
  const r=project("HT-RES-ID-opaque-key — The work that went unseen",{town:"Test City",stableName:""});
  assert.deepEqual(r,{name:"Test City",dek:"The work that went unseen",basis:"recorded locality only"});
});

test("reads a literal stable-name field in a no-colon markdown locator, not arbitrary prose", () => {
  assert.equal(title.recordedTitleName("- **Stable site name** Greenville History Museum, Miller Building\n- **Public anchor** A reading room"),"Greenville History Museum, Miller Building");
  assert.equal(title.recordedTitleName("Story: I called it a stable name once."),"");
});

test("priority title spellings lead on exact slugs, never on a substring match", () => {
  const targets={"AZ-poston-reflection":"Poston","CO-amache-reflection":"Amache","bayhorse":"Bayhorse Ghost Town","AZ-bisbee-deportation-reflection":"Bisbee Deportation","AR-walnut-ridge-rail-and-airfield-workers":"Wings of Honor Museum"};
  for(const [slug,name] of Object.entries(targets)) assert.equal(project("Recorded story", {slug}).name,name);
  assert.equal(project("Bayhorse Alternative", {slug:"another-bayhorse"}).name,"Bayhorse Alternative");
});

test("preserves multilingual exact names and rejects leaked internal tokens", () => {
  assert.equal(project("Nohwike’ Bágowa Museum: the work of a community").name,"Nohwike’ Bágowa Museum");
  const bad=project("HT-RES-AZ — A disputed claim", {stableName:"Catalog HT-RES-AZ-001"});
  assert.doesNotMatch(bad.name,/HT-RES/i);
  assert.doesNotMatch(bad.dek,/HT-RES/i);
});

test("archive venue does not replace the documented historical subject", () => {
  assert.equal(project("HT-RES-CO-denver-japantown-community — A neighborhood made through everyday work", {
    slug:"CO-denver-japantown-community",
    stableName:"Denver Public Library Central Library, Special Collections & Archives; Denver Japanese community digital-reading dossier.",
  }).name,"Denver Japanese community");
});

test("uses named courthouse instead of a generic city label when the exact record establishes it", () => {
  assert.equal(project("Hoxie — The mail carrier who became county clerk", {
    slug:"KS-hoxie-courthouse-county-work",town:"Hoxie", stableName:"Sheridan County Courthouse — Hoxie",
  }).name,"Sheridan County Courthouse");
});

test("a stable place name remains the lead when a heading appends a narrative conjunction", () => {
  assert.deepEqual(project("Mississippi Governor’s Mansion and the work of keeping a public house", {
    stableName:"Mississippi Governor’s Mansion",
  }), {name:"Mississippi Governor’s Mansion",dek:"the work of keeping a public house",basis:"source heading"});
});
