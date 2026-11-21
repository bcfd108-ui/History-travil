// Data layer — the ONLY module that knows where catalog data comes from.
// Stage 1: reads the JSON dataset produced by scripts/convert.mjs from the
// research dossiers. Stage 2 swaps these loaders for a database + accounts
// behind this same interface, so pages never change. See ARCHITECTURE.md.
import { checkEntry } from "./visit-facts.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tiesFor, toV1, hasPoint, isPending, eraOf, libraryCounts } from "./maps-core.mjs";

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
  stopType: "reflection" | "view" | "hunt";
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
  mapPoint: {lat:number; lon:number} | null;
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
  stopType: "reflection" | "view" | "hunt";
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
// HISTORIC PHOTOGRAPHS (owner's ruling, Nov 19, 2026): every entry carries a
// sourced historical photograph — of the real site or the object, or one like
// it, labelled representative when it is not the site itself. Public domain or
// openly licensed only; repository, date and credit print with the image; the
// pixels are inspected before an image is adopted (a catalog title is not
// proof of what a photograph shows). Records live in data/historic-photos.json,
// a hand-maintained sidecar the converter does not generate. An entry with no
// honestly sourced image simply has no figure — the gap prints in its record.
// ---------------------------------------------------------------------------
export interface HistoricPhoto extends PhotoFrame {
  /** Both frames have been approved for this exact entry and viewpoint. */
  pair?: { then: PhotoFrame; now: PhotoFrame };
}

export interface PhotoFrame {
  src: string;
  alt: string;
  caption: string;
  credit: string;
  sourceName: string;
  sourceUrl: string;
  dateNote?: string;
  representative?: boolean;
}

let photosCache: Record<string, HistoricPhoto> | null = null;

export function getHistoricPhoto(slug: string): HistoricPhoto | undefined {
  if (!photosCache) {
    try {
      photosCache = load<Record<string, HistoricPhoto>>("historic-photos.json");
    } catch {
      photosCache = {};
    }
  }
  return photosCache[slug];
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

// ---------------------------------------------------------------------------
// TOURS (recovered from the owner's app records, Nov 19, 2026): chained
// routes — stops in the order the story happened. Records live in
// data/tours.json, a hand-maintained sidecar the converter does not
// generate. A stop links to its catalog entry where one is published;
// where none is yet, the stop stands on its own text. Every tour is free
// and self-guided; where a town runs its own free walking tour, the tour
// page links it (localLinks).
// ---------------------------------------------------------------------------
export interface TourStop {
  name: string;
  place: string;
  hook: string;
  siteSlug?: string;
  gateShort?: string;
}

export interface LocalTour {
  name: string;
  org: string;
  kind: "Free" | "Paid";
  note: string;
  url: string;
}

export interface Tour {
  id: string;
  name: string;
  meta: string;
  description: string;
  drive?: string;
  season?: string;
  landing?: string;
  stops: TourStop[];
  localTours?: LocalTour[];
}

let toursCache: Tour[] | null = null;

export function getTours(): Tour[] {
  if (!toursCache) {
    try {
      toursCache = load<Tour[]>("tours.json");
    } catch {
      toursCache = [];
    }
  }
  return toursCache;
}

export function getTour(id: string): Tour | undefined {
  return getTours().find((t) => t.id === id);
}

/** Every tour (route) whose stop list includes this catalog entry. */
export function getToursForSite(slug: string): Tour[] {
  return getTours().filter((t) => t.stops.some((s) => s.siteSlug === slug));
}

// ---------------------------------------------------------------------------
// HISTORIC MAPS (owner's direction, Nov 20, 2026 — "historic maps should be
// part of it"): an entry or a route may carry a historic map — a Sanborn
// sheet, a USGS quadrangle, a period plat — when one has been honestly
// sourced from the entry's own dossier record: public domain, with the
// repository, date and credit printed alongside, and a stable source URL
// verified before adoption. Records live in data/historic-maps.json, a
// hand-maintained sidecar keyed by entry slug or tour id, same pattern as
// historic-photos.json. No verified map, no figure — the slot renders
// nothing and the gap stays in the record. No image is ever generated or
// guessed into this slot.
// ---------------------------------------------------------------------------
export interface HistoricMap {
  src: string;
  alt: string;
  caption: string;
  credit: string;
  sourceName: string;
  sourceUrl: string;
  dateNote?: string;
}

// THE MAP LIBRARY (Nov 21, 2026): records now live in
// data/historic-map-library.json — sheets[] and ties[] as filed by the map
// lane (rules in lib/maps-core.mjs, enforced at build by
// scripts/check-maps.mjs). Swapping in a newer library version is a
// one-file change. data/historic-maps.json (v1) is kept only as the frozen
// migration fixture the build check compares Boone against.
export interface MapSheet {
  id: string;
  title: string;
  maker: string | null;
  publisher: string | null;
  date: string;
  dateSort: string;
  type: string;
  source: {
    collection?: string | null;
    itemId?: string | null;
    sheetFile?: string | null;
    pageUrl: string;
    itemJsonUrl?: string | null;
    metadataUrl?: string | null;
    /** Non-display source files (GeoTIFF/GeoPDF). Never used as image.src. */
    sourceFiles?: Record<string, string> | null;
  };
  image: {
    src: string | null;
    /** v3: "pending-conversion-upload" until a stable display URL is hosted. */
    status?: string | null;
    large?: string | null;
    iiifService?: string | null;
    iiifInfo?: string | null;
    master?: string | null;
    width?: number | null;
    height?: number | null;
    host?: string | null;
    commonsPage?: string | null;
    displayDerivativeNeeded?: boolean;
    conversion?: string | null;
    plannedCommonsFile?: string | null;
    plannedSrcAfterUpload?: string | null;
    rule?: string | null;
    geopdf?: string | null;
    thumbnail?: string | null;
  };
  addedIn?: string | null;
  credit: string;
  rights?: string | null;
  place: { town: string; county?: string | null; state: string };
  coverage: {
    bounds: string | Record<string, string> | null;
    basis: string;
    description?: string | null;
  };
  sheetNumber?: string | null;
  setSize?: number | null;
  setNote?: string | null;
  printedScale?: string | null;
  printedNorth?: string | null;
  limitsNote: string;
  caption?: string | null;
  alt?: string | null;
  sourceName?: string | null;
}

export interface MapTie {
  sheetId: string;
  entrySlug: string;
  entryKind: "site" | "tour";
  entryUrl?: string;
  position: { x: number; y: number } | null;
  status: "checked" | "no-point-by-rule";
  caption?: string | null;
  dateNote?: string | null;
  basisNote?: string | null;
  addedIn?: string | null;
}

export interface MapLibrary {
  version: number | string;
  generated?: string;
  sheets: MapSheet[];
  ties: MapTie[];
}

let libraryCache: MapLibrary | null = null;

export function getMapLibrary(): MapLibrary {
  if (!libraryCache) {
    try {
      libraryCache = load<MapLibrary>("historic-map-library.json");
    } catch {
      libraryCache = { version: 0, sheets: [], ties: [] };
    }
  }
  return libraryCache;
}

export function getMapSheet(id: string): MapSheet | undefined {
  return getMapLibrary().sheets.find((s) => s.id === id);
}

/** Every tie on one sheet. */
export function getTiesForSheet(id: string): MapTie[] {
  return getMapLibrary().ties.filter((t) => t.sheetId === id);
}

/** All sheets tied to an entry slug or tour id, oldest sheet first. */
export function getHistoricMapsFor(key: string): { tie: MapTie; sheet: MapSheet }[] {
  return tiesFor(getMapLibrary(), key) as { tie: MapTie; sheet: MapSheet }[];
}

/** One v1-shaped record for a key (first sheet in date order), rebuilt from
 *  the library by its backCompat mapping. Kept for callers of the old API. */
export function getHistoricMap(key: string): HistoricMap | undefined {
  for (const { tie, sheet } of getHistoricMapsFor(key)) {
    const rec = toV1(tie, sheet);
    if (rec) return rec as HistoricMap;
  }
  return undefined;
}

export { hasPoint as mapTieHasPoint, isPending as mapSheetPending, eraOf as mapSheetEra, libraryCounts as mapLibraryCounts };

// ---------------------------------------------------------------------------
// CONNECTED GROUND (owner's direction, Nov 20, 2026): entries link to each
// other only on connections the record itself supports — never on a
// resemblance invented by the code. Three kinds, in this order:
//   1. ROUTE — the two entries are stops on the same tour in tours.json.
//   2. CORRIDOR — a named corridor, river, or trail (the lexicon below)
//      appears in BOTH entries' own record text (title, story, then/now,
//      what's-still-there). A phrase present in only one record links
//      nothing.
//   3. TOWN — both entries carry the same town in their locator-derived
//      record (many desk-published entries carry no town; they simply
//      earn no town link).
// Themes are NOT used: they are broad subject buckets, and sharing one is
// not a connection. The result is capped; route-mates come first.
// ---------------------------------------------------------------------------
const CORRIDORS: { phrase: string; label: string }[] = [
  { phrase: "lincoln highway", label: "The Lincoln Highway" },
  { phrase: "pony express", label: "The Pony Express line" },
  { phrase: "route 66", label: "Route 66" },
  { phrase: "santa fe trail", label: "The Santa Fe Trail" },
  { phrase: "oregon trail", label: "The Oregon Trail" },
  { phrase: "lewis and clark", label: "The Lewis and Clark route" },
  { phrase: "mississippi river", label: "The Mississippi River" },
  { phrase: "missouri river", label: "The Missouri River" },
  { phrase: "columbia river", label: "The Columbia River" },
  { phrase: "snake river", label: "The Snake River" },
  { phrase: "clearwater river", label: "The Clearwater River" },
];

export interface ConnectedSite {
  site: Site;
  /** The connection, named in a few words — printed beside the link. */
  connection: string;
}

let recordTextCache: Map<string, string> | null = null;

function recordText(site: Site): string {
  if (!recordTextCache) recordTextCache = new Map();
  let text = recordTextCache.get(site.slug);
  if (text === undefined) {
    text = [site.title, site.story, site.thenNow, site.stillThere]
      .join("\n")
      .toLowerCase();
    recordTextCache.set(site.slug, text);
  }
  return text;
}

export function getConnectedSites(site: Site, limit = 4): ConnectedSite[] {
  const out: ConnectedSite[] = [];
  const seen = new Set<string>([site.slug]);
  const push = (other: Site, connection: string) => {
    if (seen.has(other.slug) || out.length >= limit) return;
    seen.add(other.slug);
    out.push({ site: other, connection });
  };

  // 1. Route-mates.
  for (const tour of getToursForSite(site.slug)) {
    for (const stop of tour.stops) {
      if (!stop.siteSlug || stop.siteSlug === site.slug) continue;
      const other = getSite(stop.siteSlug);
      if (other) push(other, `Same route — ${tour.name}`);
      if (out.length >= limit) return out;
    }
  }

  // 2. A named corridor, river, or trail in both records.
  const myText = recordText(site);
  const myCorridors = CORRIDORS.filter((c) => myText.includes(c.phrase));
  if (myCorridors.length > 0) {
    for (const other of getSites()) {
      if (seen.has(other.slug)) continue;
      const otherText = recordText(other);
      const shared = myCorridors.find((c) => otherText.includes(c.phrase));
      if (shared) push(other, `Both on ${shared.label}`);
      if (out.length >= limit) return out;
    }
  }

  // 3. Same town, where the record carries one.
  if (site.town) {
    for (const other of getSites()) {
      if (seen.has(other.slug)) continue;
      if (other.town === site.town && other.stateCode === site.stateCode) {
        push(other, `Same town — ${site.town}`);
      }
      if (out.length >= limit) return out;
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// HUNTS (Stage 1 of the game layer, Nov 20, 2026): the three founding hunts
// with their find lists recovered verbatim from the original app's record
// (the Nov 18, 2026 app's FINDS / FINDS2 / FINDS3 lists, identical in the
// later app seed data). Records live in data/hunts.json, a hand-maintained
// sidecar the converter does not generate — same pattern as tours.json.
//
// ACTIVATION (owner's ruling, Nov 20, 2026): every hunt and every find in
// this file is ACTIVE status — activated on the owner's word alone, with
// no field check: the owner cannot be the feet for the whole catalog, and
// activation no longer waits on one. The finds rest on the research
// record; nothing here claims a find was field-verified. A tag is
// witnessed by the player's own presence, and by their photo or position
// only when the player chooses to give them at tag time. The hunts are
// unscored (the Desk guide "the-game-law" states the rule). The original
// app's quiz fields (question / options / answer key) are deliberately
// NOT carried — this edition's game law has no question gates and no
// answer keys; the tag is the visit itself, claimed through the entry
// page's existing ClaimFind panel, and hunt progress derives from those
// claims (see HuntProgress).
//
// A find names its ground (groundName / place, from the original app's own
// site entries) and ties to a catalog entry only where this edition's
// catalog actually has one for that ground (entrySlug). Where it does not,
// entrySlug is null and the find is carried untied — listed on its hunt
// page on its own text, like an unlinked tour stop — until the entry
// exists. An untied find is NOT taggable (owner's ruling, Nov 20, 2026:
// the hunts must have catalog entries — tagging happens only from a
// catalog entry's page) and does not count toward its hunt's badge total;
// the moment an entrySlug is set, it joins the hunt's progress
// automatically. No tie is invented to fill the gap.
//
// Reflection ground is never part of a hunt: getHuntFindsForSite and
// huntFindsForRender both drop any find tied to a reflection entry, so the
// rule holds in code wherever finds are rendered, whatever the data says.
// ---------------------------------------------------------------------------
export interface HuntFind {
  n: number;
  /** Catalog entry this find is tagged on, or null when this edition's
   *  catalog has no entry for the find's ground yet (carried untied). */
  entrySlug: string | null;
  /** The original app's site id for this find's ground. */
  appSite: string;
  /** The find's ground as the original app's own entry names it. */
  groundName: string;
  place: string;
  /** The find's name — the label a claim records when it is tagged. */
  label: string;
  task: string;
  hint?: string;
  status: "active";
  sourceNote: string;
}

export interface Hunt {
  slug: string;
  name: string;
  ground: string;
  about: string;
  /** The stamp-book badge this hunt's completion records, and its theme. */
  badge: string;
  badgeTheme: string;
  tier: string;
  status: "active";
  finds: HuntFind[];
  /** Reading in this edition's catalog behind the hunt (not finds). */
  related: { slug: string; label: string }[];
}

let huntsCache: Hunt[] | null = null;

export function getHunts(): Hunt[] {
  if (!huntsCache) {
    try {
      huntsCache = load<Hunt[]>("hunts.json");
    } catch {
      huntsCache = [];
    }
  }
  return huntsCache;
}

export function getHunt(slug: string): Hunt | undefined {
  return getHunts().find((h) => h.slug === slug);
}

/** True when a slug names a reflection entry in the catalog. */
function isReflectionSlug(slug: string): boolean {
  const s = getSite(slug);
  return !!s && s.stopType === "reflection";
}

/**
 * The finds of a hunt as they may be rendered: any find tied to a
 * reflection entry is dropped — reflection ground is never part of a hunt,
 * enforced here so no rendering path can surface one.
 */
export function huntFindsForRender(hunt: Hunt): HuntFind[] {
  return hunt.finds.filter((f) => !f.entrySlug || !isReflectionSlug(f.entrySlug));
}

/**
 * Hunt finds tied to one catalog entry — the finds that entry's ClaimFind
 * panel can offer. Reflection entries return none, whatever the data says:
 * the game goes quiet on reflection ground by design.
 */
export function getHuntFindsForSite(
  siteSlug: string,
): { hunt: Hunt; find: HuntFind }[] {
  if (isReflectionSlug(siteSlug)) return [];
  const out: { hunt: Hunt; find: HuntFind }[] = [];
  for (const hunt of getHunts()) {
    for (const find of hunt.finds) {
      if (find.entrySlug === siteSlug) out.push({ hunt, find });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// PLAIN TOPS (owner's ruling, Nov 19, 2026): every entry gets a short,
// plain-language top — what it is, what happened there, what you can see
// now, before-you-go facts — readable by a 12-year-old standing in a
// parking lot. The full dossier stays below under "The full record."
// Hand-written sidecar, same pattern as historic-photos.json; the
// converter does not generate it. Sample entry: st-joe-st-maries.

export interface PlainTopSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface PlainTop {
  sections: PlainTopSection[];
}

let plainTopsCache: Record<string, PlainTop> | null = null;

export function getPlainTop(slug: string): PlainTop | undefined {
  if (!plainTopsCache) {
    try {
      plainTopsCache = load<Record<string, PlainTop>>("plain-tops.json");
    } catch {
      plainTopsCache = {};
    }
  }
  return plainTopsCache[slug];
}

type VisitFact = { value: string; from: string[] };
export interface VisitFacts {
  reviewDigest: string;
  rows: Record<string, VisitFact>;
  evidence: Record<string, string>;
  warning?: VisitFact;
  reading?: boolean;
  voices?: string[];
}

let visitFactsCache: Record<string, VisitFacts> | undefined;
export function getVisitFacts(site: Site): VisitFacts | undefined {
  visitFactsCache ??= load<Record<string, VisitFacts>>("visit-facts.json");
  const facts = visitFactsCache[site.slug];
  if (facts && !checkEntry(site, facts, getPlainTop(site.slug)).length) return facts;
}
