// Ingest the converter's catalog into the Supabase `sites` table.
//
// The converter (scripts/convert.mjs) stays the ingest pipeline: it turns
// the research dossiers into data/sites.json, and this script loads that
// JSON into Postgres. It is a server-side, operator-run tool — never part
// of the web build, never run from a browser.
//
// Required environment (server-only; the service-role key bypasses RLS and
// must never be exposed to a client or committed):
//   NEXT_PUBLIC_SUPABASE_URL   the project URL
//   SUPABASE_SERVICE_ROLE_KEY  the service-role key
//
// When either is absent the script says so and exits without touching
// anything — the same dormant honesty the app itself keeps. Run order:
//   npm run convert && node scripts/ingest-sites.mjs
//
// The visitable anchor columns are derived here with the same rule whose
// authority is lib/data.ts getVisitableAnchor() — locator fields only,
// archives never anchors, NULL (flagged) when no anchor is named. If the
// rule changes there, mirror it here.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!url || !serviceKey) {
  console.error(
    "ingest-sites: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. " +
      "Neither is present in this environment, so nothing was ingested. " +
      "The keys are wired at deployment (Stage 3) and live only in the operator's environment.",
  );
  process.exit(2);
}

// --- the anchor derivation, mirroring lib/data.ts ---------------------------
const NAMED_ANCHOR_KEYS = [
  "Principal public stop", "Public visitor anchor", "Public interpretation site",
  "Public interpretation stop", "Permanent public visitor destination",
  "Permanent public destination", "Museum destination", "Existing visitor destinations",
  "Separate public alternative", "Public visitor locality", "Principal stop",
  "public interpretation site", "Public stop coordinates", "public locator",
  "Public visitor identification", "Printed public museum locator",
  "Public-facing operator/site", "Printed public visitor locator",
  "Printed public destination", "Public visitor destination",
];
const LEWISTON_CITY_WALK = new Set([
  "lewiston-locomotive-park", "lewiston-depot", "lewiston-main-street",
  "lewiston-normal-hill", "lewiston-confluence",
]);
const OPERATOR_POSITIVE =
  /national park service|state parks|parks and recreation|bureau of land management|forest service|fish and wildlife service|museum|cultural (center|institute|centre)|historical society|historic site|heritage (site|center|centre)/i;
const OPERATOR_NEGATIVE =
  /research option|conditional physical research|reading room|research appointments|appointment-only/i;

const clean = (v) => (v || "").replace(/\*\*/g, "").trim();
const hasContent = (v) => {
  const c = clean(v);
  return c.length > 0 && !/^blank/i.test(c);
};
const extra = (site, key) => {
  const e = (site.locator.extra || []).find((x) => x.key === key);
  return e ? e.value : "";
};

function anchorOf(site) {
  let name = null;
  let basis = "";
  const pa = extra(site, "Public anchor");
  if (hasContent(pa) && !/^archive-only/i.test(clean(pa))) {
    name = clean(pa);
    basis = "Public anchor";
  }
  if (!name) {
    for (const k of NAMED_ANCHOR_KEYS) {
      const v = extra(site, k);
      if (hasContent(v)) {
        name = clean(v);
        basis = k;
        break;
      }
    }
  }
  if (!name) {
    const addr = clean(site.locator.address || "");
    if (
      addr &&
      /\d{5}|\d+\s+[NSEW]\.?\s|street|avenue|ave\.|road|rd\.|highway|hwy|drive|blvd|lane|st\./i.test(addr) &&
      !/research institution|archive|repository/i.test(addr)
    ) {
      name = addr.split(";")[0];
      basis = "printed address";
    }
  }
  if (!name && site.coordinates) {
    name = `${site.town ? `${site.town}, ` : ""}${site.state} — point recorded in the dossier`;
    basis = "recorded point";
  }
  if (!name) {
    const op = clean(site.locator.operator || "");
    if (op && OPERATOR_POSITIVE.test(op) && !OPERATOR_NEGATIVE.test(op)) {
      const place = clean(extra(site, "Place")) || site.title;
      name = `${place} — operated by ${op.split(";")[0].slice(0, 90)}`;
      basis = "operator";
    }
  }
  if (!name) return null;
  let approach = "drive-up";
  const text = `${name} ${(site.access || "").slice(0, 400)}`;
  if (LEWISTON_CITY_WALK.has(site.slug)) approach = "city walk";
  else if (basis === "public locator" || /sidewalk|overlook|levee|parkway|viewpoint|riverfront/i.test(text))
    approach = "nearest public ground";
  else if (/trailhead|\btrail\b|hike|hiking/i.test(text)) approach = "hike";
  else if (/short walk|walk from|walking distance/i.test(text)) approach = "short walk";
  let boundary = "";
  for (const k of ["Visitor boundary", "Entrance scope"]) {
    const v = extra(site, k);
    if (hasContent(v)) {
      boundary = clean(v);
      break;
    }
  }
  if (!boundary) {
    const ent = extra(site, "Permanent public entrance");
    if (hasContent(ent) && /not a public entrance|not an entrance/i.test(ent)) boundary = clean(ent);
  }
  return { name, approach, boundary };
}

// --- load -------------------------------------------------------------------
const sites = JSON.parse(
  readFileSync(join(process.cwd(), "data", "sites.json"), "utf8"),
);
const rows = sites.map((s) => {
  const a = anchorOf(s);
  return {
    slug: s.slug,
    ht_id: s.id,
    title: s.title,
    town: s.town,
    state: s.state,
    state_code: s.stateCode,
    division: s.division,
    themes: s.themes,
    stop_type: s.stopType,
    standfirst: s.standfirst,
    lead: s.lead,
    access: s.access,
    story: s.story,
    then_now: s.thenNow,
    still_there: s.stillThere,
    progression: s.progression,
    gaps: s.gaps,
    photo_record: s.photoRecord,
    more_sections: s.moreSections,
    sources: s.sources,
    locator: s.locator,
    lat: s.coordinates ? s.coordinates.lat : null,
    lon: s.coordinates ? s.coordinates.lon : null,
    coordinate_kind: s.coordinateKind,
    candidate_finds: s.candidateFinds,
    published_as: s.publishedAs,
    anchor_name: a ? a.name : null,
    anchor_approach: a ? a.approach : null,
    anchor_boundary: a ? a.boundary : null,
    payload: s,
    ingested_at: new Date().toISOString(),
  };
});

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BATCH = 100;
let done = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  const { error } = await db.from("sites").upsert(chunk, { onConflict: "slug" });
  if (error) {
    console.error(`ingest-sites: upsert failed at row ${i}: ${error.message}`);
    process.exit(1);
  }
  done += chunk.length;
  console.log(`ingest-sites: ${done}/${rows.length}`);
}
const flagged = rows.filter((r) => !r.anchor_name).map((r) => r.slug);
console.log(
  `ingest-sites: done. ${rows.length} sites upserted; ${flagged.length} carry no visitable anchor (flagged, not invented):`,
);
for (const f of flagged) console.log(`  - ${f}`);
