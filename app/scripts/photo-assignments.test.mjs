import assert from "node:assert/strict";
import test from "node:test";
import {validateAssignments} from "./photo-assignments.mjs";
function fixture() {
  const site = {id:"HT-EX", slug:"example", title:"Mill", town:"Town", state:"State"};
  const manifest={commit:"a".repeat(40),catalogCount:1,entries:[site]};
  const row={rowId:"one",targetSlug:site.slug,targetId:site.id,targetTitle:site.title,targetTown:site.town,targetState:site.state,decision:"APPROVED",eraRole:"now",reason:"Identified mill",subjectName:"Mill",sourcePageUrl:"https://example.org/record",imageUrl:"https://example.org/photo",license:"CC0",credit:"Photographer",caption:"Mill",imageTitleOrDescription:"Mill exterior",imageSourceName:"Archive",matchEvidence:[{type:"sourceDescription",detail:"Names the mill"},{type:"address",detail:"Exact street number"}],collisionCheck:"Compared mills on both riverbanks",sharedUseWith:[],sha256:"b".repeat(64)};
  const p={...row,sourceUrl:row.sourcePageUrl,sourceName:row.imageSourceName};
  return {manifest,sites:[site],rows:[row],records:{example:[p]}};
}
const run = f=>validateAssignments(f.manifest,f.sites,f.rows,f.records);
test("consistent assignment",()=>assert.equal(run(fixture()).photos,1));
for (const [label,mutate] of Object.entries({
  orphan:f=>{f.records.unknown=f.records.example;delete f.records.example},
  hold:f=>{f.rows[0].decision="HOLD"},
  id:f=>{f.records.example[0].targetId="HT-other"},
  town:f=>{f.rows[0].targetTown="Wallace"},
  title:f=>{f.rows[0].targetTitle="Another mill"},
  state:f=>{f.rows[0].targetState="Other state"},
  representative:f=>{f.records.example[0].representative=true},
  license:f=>{f.records.example[0].license=""},
  source:f=>{f.records.example[0].sourceUrl=""},
  image:f=>{f.records.example[0].imageUrl=""},
  credit:f=>{f.records.example[0].credit=""},
  locationOnly:f=>{f.rows[0].matchEvidence[0].type="county"},
  role:f=>{f.records.example[0].eraRole="then"},
  samePair:f=>{f.rows.push({...f.rows[0],rowId:"two",eraRole:"then"});f.records.example.push({...f.records.example[0],rowId:"two",eraRole:"then"})},
  shared:f=>{const site={...f.sites[0],id:"HT-Y",slug:"other"};f.manifest.entries.push(site);f.manifest.catalogCount++;f.sites.push(site);f.rows.push({...f.rows[0],rowId:"two",targetSlug:"other",targetId:site.id,sharedUseWith:["example"],sharedUseApproval:"Same resource"});f.records.other=[{...f.records.example[0],rowId:"two",targetSlug:"other",targetId:site.id}]}
})) test("rejects "+label,()=>{const f=fixture();mutate(f);assert.throws(()=>run(f),/Photo assignment/)});
