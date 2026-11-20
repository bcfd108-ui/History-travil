// Data layer — the ONLY module that knows where catalog data comes from.
// Stage 1: reads the JSON dataset produced by scripts/convert.mjs from the
// research dossiers. Stage 2 swaps these loaders for a database + accounts
// behind this same interface, so pages never change. See ARCHITECTURE.md.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface Locator {
  stableName: string;
  address: string;
  latitude: string;
  longitude: string;
  coordinateSource: string;
  nrhp: string;
  hmdb: string;
  ark: string;
  archiveId: string;
  registerUrl: string;
  operator: string;
  extra: { key: string; value: string }[];
}

export interface Site {
  id: string;
  slug: string;
  title: string;
  town: string;
  state: string;
  stateCode: string;
  division: string;
  themes: string[];
  stopType: "reflection" | "view";
  standfirst: string;
  lead: string;
  access: string;
  story: string;
  thenNow: string;
  stillThere: string;
  progression: string;
  gaps: string;
  photoRecord: string;
  moreSections: { title: string; body: string }[];
  sources: string;
  locator: Locator;
  coordinates: { lat: number; lon: number } | null;
  coordinateKind: string;
  candidateFinds: string[];
  publishedAs: string;
}

export interface IndexRow {
  slug: string;
  title: string;
  town: string;
  state: string;
  stateCode: string;
  themes: string[];
  stopType: "reflection" | "view";
  hasCoordinates: boolean;
  hasLocator: boolean;
  /** Derived at load by getVisitableAnchor() from the full record. */
  hasAnchor: boolean;
  /** The anchor's approach when one is derived; null when none is named. */
  approach: AnchorApproach | null;
}

// ---------------------------------------------------------------------------
// THE VISITABLE ANCHOR (owner's ruling, Nov 19, 2026 — the access doctrine).
//
// Every catalog entry is tied to a physical location a reader can actually
// go to: the ground where the history happened, or its surviving ground.
// The entry's VISITABLE ANCHOR is that ground as the dossier names it —
// reached by car (drive-up) or a short walk, as part of a city walk or a
// hike, or, where the exact parcel is private, gated, or not a public
// entrance, the nearest lawful public ground with the boundary printed
// (a historic pin is not a public entrance — that rule stands).
//
// Archives are SOURCES, never an entry's location: an archive, a reading
// room, or a research institution is never returned as an anchor, however
// the dossier phrases it.
//
// The derivation reads ONLY the dossier's locator record, in this order:
//   1. the locator's "Public anchor" field, when it names a place (a value
//      that opens with an archive-only declaration names no anchor);
//   2. other named public-anchor fields (principal stop, public locator,
//      public interpretation site, printed visitor destination, …);
//   3. a printed street address in the locator record, when it is not an
//      archive/repository address;
//   4. the recorded coordinate point, when the dossier prints one;
//   5. the operating authority named as operator, when it is a site
//      operator (park service, state parks, a museum, a cultural institute)
//      and not a research function ("…for conditional physical research"
//      and its kin are sources, not operators of a visit).
// Approach is classified from the anchor and gate wording (sidewalk /
// overlook / levee / parkway → nearest public ground; trail wording →
// hike; the Lewiston city-walk stops → city walk; explicit short-walk
// wording → short walk; otherwise drive-up, the doctrine's default).
//
// When NO anchor is derivable the entry is NOT dropped and NO anchor is
// invented: getVisitableAnchor returns null, the entry page says so
// plainly, and the entry is flagged for the owner's ruling on moving it to
// Research Desk reading. Type case: UT-saltair-amusement-workers — its
// dossier names only an archive, so it is flagged, even though its historic
// ground is the lakeshore; naming a lawful public anchor for it is a
// dossier act, not a code act.
// ---------------------------------------------------------------------------
export type AnchorApproach =
  | "drive-up"
  | "short walk"
  | "city walk"
  | "hike"
  | "nearest public ground";

export interface VisitableAnchor {
  name: string;
  approach: AnchorApproach;
  /** The boundary as the record prints it ("" when the record states none). */
  boundary: string;
  /** Which locator field named the anchor — the derivation's honesty trail. */
  basis: string;
}

const LEWISTON_CITY_WALK = new Set([
  "lewiston-locomotive-park",
  "lewiston-depot",
  "lewiston-main-street",
  "lewiston-normal-hill",
  "lewiston-confluence",
]);

const NAMED_ANCHOR_KEYS = [
  "Principal public stop",
  "Public visitor anchor",
  "Public interpretation site",
  "Public interpretation stop",
  "Permanent public visitor destination",
  "Permanent public destination",
  "Museum destination",
  "Existing visitor destinations",
  "Separate public alternative",
  "Public visitor locality",
  "Principal stop",
  "public interpretation site",
  "Public stop coordinates",
  "public locator",
  "Public visitor identification",
  "Printed public museum locator",
  "Public-facing operator/site",
  "Printed public visitor locator",
  "Printed public destination",
  "Public visitor destination",
];

const OPERATOR_POSITIVE =
  /national park service|state parks|parks and recreation|bureau of land management|forest service|fish and wildlife service|museum|cultural (center|institute|centre)|historical society|historic site|heritage (site|center|centre)/i;
const OPERATOR_NEGATIVE =
  /research option|conditional physical research|reading room|research appointments|appointment-only/i;

function cleanField(v: string): string {
  return (v || "").replace(/\*\*/g, "").trim();
}
function fieldHasContent(v: string): boolean {
  const c = cleanField(v);
  return c.length > 0 && !/^blank/i.test(c);
}
function extraField(site: Site, key: string): string {
  const e = site.locator.extra.find((x) => x.key === key);
  return e ? e.value : "";
}

function classifyApproach(site: Site, anchorName: string, basis: string): AnchorApproach {
  if (LEWISTON_CITY_WALK.has(site.slug)) return "city walk";
  const text = `${anchorName} ${(site.access || "").slice(0, 400)}`;
  if (basis === "public locator" || /sidewalk|overlook|levee|parkway|viewpoint|riverfront/i.test(text))
    return "nearest public ground";
  if (/trailhead|\btrail\b|hike|hiking/i.test(text)) return "hike";
  if (/short walk|walk from|walking distance/i.test(text)) return "short walk";
  return "drive-up";
}

function anchorBoundary(site: Site): string {
  for (const key of ["Visitor boundary", "Entrance scope"]) {
    const v = extraField(site, key);
    if (fieldHasContent(v)) return cleanField(v);
  }
  const entrance = extraField(site, "Permanent public entrance");
  if (fieldHasContent(entrance) && /not a public entrance|not an entrance/i.test(entrance))
    return cleanField(entrance);
  return "";
}

export function getVisitableAnchor(site: Site): VisitableAnchor | null {
  let name: string | null = null;
  let basis = "";

  const publicAnchor = extraField(site, "Public anchor");
  if (fieldHasContent(publicAnchor) && !/^archive-only/i.test(cleanField(publicAnchor))) {
    name = cleanField(publicAnchor);
    basis = "Public anchor";
  }
  if (!name) {
    for (const key of NAMED_ANCHOR_KEYS) {
      const v = extraField(site, key);
      if (fieldHasContent(v)) {
        name = cleanField(v);
        basis = key;
        break;
      }
    }
  }
  if (!name) {
    const addr = cleanField(site.locator.address || "");
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
    const op = cleanField(site.locator.operator || "");
    if (op && OPERATOR_POSITIVE.test(op) && !OPERATOR_NEGATIVE.test(op)) {
      const place = cleanField(extraField(site, "Place")) || site.title;
      name = `${place} — operated by ${op.split(";")[0].slice(0, 90)}`;
      basis = "operator";
    }
  }
  if (!name) return null;
  return {
    name,
    approach: classifyApproach(site, name, basis),
    boundary: anchorBoundary(site),
    basis,
  };
}

export interface Stats {
  sitesConverted: number;
  perState: Record<string, number>;
  withCoordinates: number;
  blankCoordinates: number;
  withAnyLocatorId: number;
  reflection: number;
  view: number;
  [k: string]: unknown;
}

function load<T>(name: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), "data", name), "utf8")) as T;
}

let sitesCache: Site[] | null = null;
let indexCache: IndexRow[] | null = null;
let statsCache: Stats | null = null;

export function getSites(): Site[] {
  if (!sitesCache) sitesCache = load<Site[]>("sites.json");
  return sitesCache;
}

export function getSite(slug: string): Site | undefined {
  return getSites().find((s) => s.slug === slug);
}

// ---------------------------------------------------------------------------
// HISTORIC LOCATION AS INFORMATION (owner's refinement, Nov 19, 2026).
//
// An entry tells the reader where the place WAS, when the record knows it —
// including entries nobody can visit. That is location-as-information: it is
// displayed as record text, never as a map point, a directions offer, or a
// visit invitation. The standing rule governs: a historic pin is not a
// public entrance. Where the dossier deliberately omits the point (its value
// says so, or is blank), the omission is the record's own statement and is
// carried as-is — this helper returns only fields with real content; pure
// blanks stay in the full locator grid, marked blank there.
// ---------------------------------------------------------------------------
const HISTORIC_LOCATION_KEY =
  /^(historic|historical|separate historical|discovery)/i;
const HISTORIC_LOCATION_NOUN = /(pin|place|site|locator|locus|junction|resource|locations)/i;

export function historicLocationFields(site: Site): { key: string; value: string }[] {
  return site.locator.extra.filter(
    (e) =>
      HISTORIC_LOCATION_KEY.test(e.key) &&
      HISTORIC_LOCATION_NOUN.test(e.key) &&
      e.value.replace(/\*\*/g, "").trim().length > 0 &&
      !/^\s*blank\s*$/i.test(e.value.replace(/\*\*/g, "")),
  );
}

// ---------------------------------------------------------------------------
// THEN/NOW PAIR STATE (owner's refinement, Nov 19, 2026).
//
// Then/now is a standard entry element: the entry's then/now section renders
// on every entry that carries one, read-remotely entries included. Where the
// record identifies a historic photograph of the ground (the "then") but
// states no obtained modern counterpart (the "now"), the entry invites a
// reader submission to complete the pair — into a pending-approval queue,
// never straight into the record (see photo_submissions in the migration).
//
// The dataset carries no structured photo-pair field, so this derivation is
// deliberately conservative TEXT evidence from the dossier's own photo
// record: an explicit historic/period photograph identification, and no
// statement of an obtained modern/repeat/current photograph. The durable
// fix is a structured field in the converter when the dossiers gain one;
// until then this signal errs toward silence (no invitation).
//
// Two product-law carve-outs: reflection ground carries no invitation (the
// game goes quiet there; no prompts to go and photograph loss ground), and
// an entry with no derivable visitable anchor carries none either — the
// invitation is a visit-shaped prompt, and it is only honest where the
// record names ground a reader may stand on.
// ---------------------------------------------------------------------------
const THEN_PHOTO = /(historic(al)? photograph|period photograph|photographic research candidate|candidate photo)/i;
const NOW_PHOTO =
  /(repeat|modern|current|now) (photo|photograph|image)[^.]{0,90}(obtained|taken|made|supplied|published|appears|was made|was taken)/i;

export function thenNowInvitation(site: Site): boolean {
  if (site.stopType === "reflection") return false;
  // The invitation's logic is the access doctrine: the ground is visitable,
  // so a reader can go and take the "now" photo. No derivable visitable
  // anchor, no invitation — the prompt never sends a reader to ground the
  // record has not named as theirs to stand on.
  if (!getVisitableAnchor(site)) return false;
  if (!THEN_PHOTO.test(site.photoRecord || "")) return false;
  if (NOW_PHOTO.test(`${site.photoRecord || ""} ${site.thenNow || ""}`)) return false;
  return true;
}

export function getIndex(): IndexRow[] {
  if (!indexCache) {
    const rows = load<Omit<IndexRow, "hasAnchor" | "approach">[]>("index.json");
    const bySlug = new Map(getSites().map((s) => [s.slug, s]));
    indexCache = rows.map((r) => {
      const full = bySlug.get(r.slug);
      const anchor = full ? getVisitableAnchor(full) : null;
      return { ...r, hasAnchor: !!anchor, approach: anchor ? anchor.approach : null };
    });
  }
  return indexCache;
}

export function getStats(): Stats {
  if (!statsCache) statsCache = load<Stats>("stats.json");
  return statsCache;
}

export function getStates(): { code: string; name: string; count: number }[] {
  const idx = getIndex();
  const by = new Map<string, { code: string; name: string; count: number }>();
  for (const r of idx) {
    const cur = by.get(r.stateCode) || { code: r.stateCode, name: r.state, count: 0 };
    cur.count++;
    by.set(r.stateCode, cur);
  }
  return [...by.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getThemes(): string[] {
  const set = new Set<string>();
  for (const r of getIndex()) r.themes.forEach((t) => set.add(t));
  return [...set].sort();
}
