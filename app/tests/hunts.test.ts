import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSites, getVisitableAnchor, type Site } from "../lib/data";
import { resolveHunts, type HuntSeed } from "../lib/hunts";
import { checked, checkGround, receiptName } from "../lib/hunt-checks";

const seeds: HuntSeed[] = JSON.parse(readFileSync("data/hunts.json", "utf8"));
const sites = getSites();
const model = (records: Site[], hunts = seeds) => resolveHunts(hunts, records, getVisitableAnchor);
const sample = sites.find(s => s.slug === "ID-bovill")!;
const target = "ID-test-lighthouse";
const lighthouse: Site = { ...sample, slug: target, title: "Test lighthouse", locator: {
  ...sample.locator, stableName: "Test lighthouse"
}};
const seed: HuntSeed = { slug: "lighthouse-test", status: "active", name: "Test hunt", badge: "Light keeper",
  region: "Idaho", area: "Test coast", theme: "Lighthouse", related: [], finds: [{
    id: "lantern", entrySlug: null, targetEntrySlug: target, label: "Find the lamp", groundName: "Test lighthouse",
    place: "Idaho", sourceNote: "Test fixture.", task: "Stand by the lamp.", hint: "Look at the lantern.", access: "roadside"
  }] };

test("catalog publication, withdrawal and reflection all propagate from the same unchanged seed", () => {
  const publish = (records: Site[]) => model(records, [seed])[0];
  const pending = publish([]); assert.equal(pending.tied, 0); assert.equal(pending.finds.length, 1);
  const live = publish([lighthouse]); assert.equal(live.tied, 1); assert.equal(live.finds[0].entrySlug, target);
  assert.equal(live.finds[0].task, seed.finds[0].task);
  assert.equal(pending.finds[0].task, live.finds[0].task);
  assert.equal(publish([{...lighthouse, stopType:"reflection"}]).finds.length, 0);
  assert.equal(publish([]).finds[0].entrySlug, null);
});

test("two tasks at the same ground remain independently taggable after a desk publish", () => {
  const other = {...seed.finds[0], id:"steps", label:"Find the steps", task:"Stand at the steps."};
  const pair = [{...seed, finds:[seed.finds[0],other]}];
  assert.equal(model([{...lighthouse,slug:"ID-same-name"}],pair)[0].tied,0);
  const hunt = model([lighthouse],pair)[0];
  assert.equal(hunt.tied,2);
  const book = {objects:new Map([[receiptName(hunt.slug,hunt.finds[0]),false]]),legacy:new Set<string>()};
  assert.ok(checked(book,hunt.slug,hunt.finds[0]));
  assert.equal(checked(book,hunt.slug,hunt.finds[1]),false);
});

test("tiers follow access, seasonal limits, and straight-line separation", () => {
  function tier(access: "roadside"|"walk"|"hike"|"remote", seasonal = false) {
    return model([lighthouse],[{...seed,finds:[{...seed.finds[0],access,seasonal}]}])[0].tier;
  }
  assert.equal(tier("roadside"),"Easy roadside"); assert.equal(tier("walk"),"Local walk");
  assert.equal(tier("hike"),"Demanding"); assert.equal(tier("remote"),"Almost unobtainable");
  assert.equal(tier("roadside",true),"Almost unobtainable");
  const pair = {...seed,finds:[seed.finds[0],{...seed.finds[0],id:"second",entrySlug:"ID-second"}]};
  const second = {...lighthouse,slug:"ID-second"};
  assert.equal(model([lighthouse,second],[pair])[0].tier,"Regional");
  assert.equal(model([lighthouse,{...second,coordinates:{lat:41,lon:-115}}],[pair])[0].tier,"Demanding");
});

test("every playable find has visitable, non-reflection catalog ground", () => {
  const bySlug = new Map(sites.map(s => [s.slug,s]));
  for (const h of model(sites)) {
    assert.equal(h.tied, h.finds.filter(f => f.entrySlug).length);
    for (const f of h.finds) if (f.entrySlug) {
      const record = bySlug.get(f.entrySlug)!;
      assert.notEqual(record.stopType,"reflection"); assert.ok(getVisitableAnchor(record));
      assert.ok(f.task && f.hint);
    }
  }
});

test("the catalog join preserves desk labels, tasks, hints and source order for pending and tied finds", () => {
  for (const hunt of model(sites)) {
    const raw = seeds.find(h => h.slug === hunt.slug)!;
    const expected = raw.finds.filter(f => sites.find(s => s.slug === (f.entrySlug ?? f.targetEntrySlug))?.stopType !== "reflection");
    assert.deepEqual(hunt.finds.map(f => [f.id,f.label,f.task,f.hint]),
      expected.map(f => [f.id,f.label,f.task,f.hint]));
  }
});

test("a fresh check uses one private object for either a receipt or a photo", async () => {
  const h = model([lighthouse],[seed])[0], f = {...h.finds[0], vicinityKm:2};
  const key = receiptName(h.slug,f); assert.match(key,/^[A-Za-z0-9.-]+$/);
  const saved = new Map<string,boolean>();
  const bucket = {
    upload: async (path:string, file: Blob, opts: {metadata:{lat:number;lon:number};upsert:boolean}) => {
      assert.equal(opts.upsert,false); assert.deepEqual([opts.metadata.lat,opts.metadata.lon],[sample.coordinates!.lat,sample.coordinates!.lon]);
      if(saved.has(path)) return {error:new Error("Duplicate")};
      saved.set(path,file.type.startsWith("image/")); return {error:null};
    },
    info: async (path:string) => ({data:{contentType:saved.get(path)?"image/png":"application/json"}})
  };
  const db = {storage:{from:(name:string) => {assert.equal(name,"scrapbook");return bucket;}}} as unknown as SupabaseClient;
  await assert.rejects(checkGround(db,"player-a",h.slug,f,{lat:0,lon:0},null),/outside/);
  assert.equal(saved.size,0);
  assert.equal(await checkGround(db,"player-a",h.slug,f,sample.coordinates!,null),false);
  assert.equal(await checkGround(db,"player-a",h.slug,f,sample.coordinates!,null),false);
  assert.equal(saved.size,1);
  assert.equal(await checkGround(db,"player-b",h.slug,f,sample.coordinates!,new File(["image"],"visit.png",{type:"image/png"})),true);
  assert.deepEqual([...saved.keys()],["player-a/hunt-checks/"+key,"player-b/hunt-checks/"+key]);
  const book = {objects:new Map([[key,false]]),legacy:new Set<string>()};
  assert.ok(checked(book,h.slug,f)); assert.equal(checked(book,h.slug,{...f,entrySlug:null}),false);
  assert.ok(checked({objects:new Map(),legacy:new Set([target+"::Old label"])},h.slug,{...f,legacyLabels:["Old label"]}));
});
