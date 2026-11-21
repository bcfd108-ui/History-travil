// node --test scripts/hunts-core.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  checkHunts,
  computeHuntProgress,
  hasCapturedLocation,
  indexCatalog,
  isReflectionSite,
  resolveFind,
  tierFor,
} from "../lib/hunts-core.mjs";

const site = (slug, extra = {}) => ({
  slug,
  title: slug,
  stopType: "view",
  access: "",
  coordinates: null,
  locator: { extra: [] },
  ...extra,
});
const themes = [{ id: "mining" }, { id: "fire-service" }, { id: "timber-rail" }];
const hunt = (finds) => [
  { slug: "h", name: "H", badge: "B", theme: "mining", region: "R", status: "active", finds },
];
const find = (n, entrySlug, appSite, groundKey = `g-${n}`) => ({
  n,
  entrySlug,
  appSite,
  groundKey,
  label: `L${n}`,
  task: "T",
});

test("entrySlug that resolves ties; unpublished slug stays untied", () => {
  const h = hunt([
    find(1, "a", "x", "g-1"),
    find(2, "not-yet", "y", "g-2"),
    find(3, null, "z", "g-3"),
  ]);
  const idx = indexCatalog([site("a")], h);
  assert.equal(resolveFind(h[0].finds[0], idx).status, "tied");
  assert.equal(resolveFind(h[0].finds[1], idx).status, "untied");
  assert.equal(resolveFind(h[0].finds[2], idx).status, "untied");
});

test("Ruling 3: bare shared appSite never auto-ties every find carrying it", () => {
  const pulaskiPair = hunt([
    find(3, null, "wallace-tool", "wallace-tool-museum"),
    find(5, null, "wallace-tool", "pulaski-in-service"),
  ]);
  const bareClaim = site("ID-wallace-mining-museum", {
    locator: { extra: [{ key: "App site", value: "wallace-tool" }] },
  });
  const idx = indexCatalog([bareClaim], pulaskiPair);
  assert.equal(resolveFind(pulaskiPair[0].finds[0], idx).status, "untied");
  assert.equal(resolveFind(pulaskiPair[0].finds[1], idx).status, "untied");
});

test("Ruling 3: per-find Hunt ground claim ties Find 3 and leaves Find 5 untied", () => {
  const pulaskiPair = hunt([
    find(3, null, "wallace-tool", "wallace-tool-museum"),
    find(5, null, "wallace-tool", "pulaski-in-service"),
  ]);
  const museumEntry = site("ID-wallace-mining-museum", {
    locator: {
      extra: [
        { key: "App site", value: "wallace-tool" },
        { key: "Hunt ground", value: "wallace-tool-museum" },
      ],
    },
  });
  const idx = indexCatalog([museumEntry], pulaskiPair);
  const r3 = resolveFind(pulaskiPair[0].finds[0], idx);
  const r5 = resolveFind(pulaskiPair[0].finds[1], idx);
  assert.equal(r3.status, "tied");
  assert.equal(r3.site.slug, "ID-wallace-mining-museum");
  assert.equal(r5.status, "untied");
});

test("Ruling 3: unshared appSite ties its single find when no Hunt ground conflicts", () => {
  const h = hunt([find(1, null, "clearwater-bridge", "clearwater-bridge")]);
  const bridge = site("ID-clearwater-bridge", {
    locator: { extra: [{ key: "App site", value: "clearwater-bridge" }] },
  });
  const idx = indexCatalog([bridge], h);
  const r = resolveFind(h[0].finds[0], idx);
  assert.equal(r.status, "tied");
  assert.equal(r.site.slug, "ID-clearwater-bridge");
});

test("Ruling 1: reflection ground and Sunshine Miners Memorial denylist fail the check", () => {
  const sites = [
    site("r", { stopType: "reflection" }),
    site("ID-sunshine-miners-memorial", { stopType: "view" }),
  ];
  assert.equal(isReflectionSite(sites[1]), true);
  assert.match(checkHunts(hunt([find(1, "r", "x", "g-1")]), sites, themes).join("\n"), /REFLECTION/);
  assert.match(
    checkHunts(hunt([find(1, "ID-sunshine-miners-memorial", "sunshine-mine", "sunshine-mine")]), sites, themes).join("\n"),
    /REFLECTION/,
  );
  // Even without sites.json containing it, the denylist blocks Sunshine by slug or appSite.
  assert.match(
    checkHunts(hunt([find(1, null, "sunshine-mine", "sunshine-mine")]), [], themes).join("\n"),
    /REFLECTION/,
  );
});

test("two entries claiming one ground fail the check", () => {
  const ex = { locator: { extra: [{ key: "Hunt ground", value: "wallace-tool-museum" }] } };
  assert.match(
    checkHunts(hunt([find(3, null, "wallace-tool", "wallace-tool-museum")]), [site("a", ex), site("b", ex)], themes).join("\n"),
    /one ground, one entry/,
  );
});

test("unknown theme fails the check", () => {
  const h = hunt([find(1, "a", "x", "g-1")]);
  h[0].theme = "nope";
  assert.match(checkHunts(h, [site("a")], themes).join("\n"), /not in data\/hunt-themes\.json/);
});

test("Ruling 4: location-less check-ins advance zero hunt progress and earn no badge", () => {
  const finds = [
    { n: 1, label: "Stand in brick", tiedSlug: "ID-wallace-brick-core" },
    { n: 2, label: "Measure canyon", tiedSlug: "ID-burke" },
    { n: 3, label: "Untied find", tiedSlug: null },
  ];
  assert.equal(hasCapturedLocation({ claim_lat: null, claim_lon: null }), false);
  assert.equal(hasCapturedLocation({ claim_lat: Number.NaN, claim_lon: -115.9 }), false);
  assert.equal(hasCapturedLocation({ claim_lat: 47.474, claim_lon: -115.925 }), true);

  // Location-less check-ins for every tied find -> 0 progress, incomplete.
  const noLoc = computeHuntProgress(finds, [
    { site_slug: "ID-wallace-brick-core", find_label: "Stand in brick", claim_lat: null, claim_lon: null },
    { site_slug: "ID-burke", find_label: "Measure canyon", claim_lat: null, claim_lon: null },
  ]);
  assert.equal(noLoc.tied, 2);
  assert.equal(noLoc.done, 0);
  assert.equal(noLoc.complete, false);

  // One located + one location-less -> 1 of 2, incomplete.
  const oneLoc = computeHuntProgress(finds, [
    { site_slug: "ID-wallace-brick-core", find_label: "Stand in brick", claim_lat: 47.474, claim_lon: -115.925 },
    { site_slug: "ID-burke", find_label: "Measure canyon", claim_lat: null, claim_lon: null },
  ]);
  assert.equal(oneLoc.done, 1);
  assert.equal(oneLoc.complete, false);

  // All tied finds located -> complete (untied find excluded from denominator).
  const allLoc = computeHuntProgress(finds, [
    { site_slug: "ID-wallace-brick-core", find_label: "Stand in brick", claim_lat: 47.474, claim_lon: -115.925 },
    { site_slug: "ID-burke", find_label: "Measure canyon", claim_lat: 47.519, claim_lon: -115.861 },
  ]);
  assert.equal(allLoc.tied, 2);
  assert.equal(allLoc.done, 2);
  assert.equal(allLoc.complete, true);
});

test("tier rule", () => {
  const anchor = (name) => () => ({ name, approach: "drive-up" });
  const p = (lat, lon) => ({ lat, lon });
  assert.equal(tierFor([], anchor("x")).tier, null);
  assert.equal(tierFor([site("a", { coordinates: p(47, -116) })], anchor("Main street")).tier, 1);
  assert.equal(tierFor([site("a", { coordinates: p(47, -116) }), site("b", { coordinates: p(47.1, -116) })], anchor("Main street")).tier, 2);
  assert.equal(tierFor([site("a", { coordinates: p(47, -116) }), site("b", { coordinates: p(49, -116) })], anchor("Main street")).tier, 3);
  assert.equal(tierFor([site("a")], anchor("Trailhead — Trail No. 38, two miles each way")).tier, 3);
  assert.equal(tierFor([site("a", { access: "The road is closed in winter." })], anchor("x")).tier, 4);
  assert.equal(tierFor([site("a", { access: "High-clearance vehicle needed." })], anchor("x")).tier, 4);
});

test("live hunts.json + hunt-themes.json pass checkHunts", () => {
  const hunts = JSON.parse(readFileSync(new URL("../data/hunts.json", import.meta.url), "utf8"));
  const sites = JSON.parse(readFileSync(new URL("../data/sites.json", import.meta.url), "utf8"));
  const liveThemes = JSON.parse(readFileSync(new URL("../data/hunt-themes.json", import.meta.url), "utf8"));
  assert.deepEqual(checkHunts(hunts, sites, liveThemes), []);
});
