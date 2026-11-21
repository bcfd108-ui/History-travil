import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getTour, type Tour } from "./data";
import { normalize } from "../scripts/navigation-fields.mjs";

export interface BrowseRow {
  slug: string;
  title: string;
  state: string;
  stateCode: string;
  town: string;
  county: string;
  stopType: string;
  themes: string[];
  mapPoint: { lat: number; lon: number } | null;
  recordedName: string;
  recordedNameKey: string;
  nameKey: string;
  townKey: string;
  areaKey: string;
  text: string;
}
export type Query = Record<string, string>;
export type RawQuery = Record<string, string | string[] | undefined>;
export const PAGE = 24;
export const paths = [
  "Prisons & Asylums",
  "Military Ground",
  "Haunted Tellings",
  "The Weird & Curious",
  "Battlefields",
];
export const pathName = (s: string) =>
  s === "Haunted Tellings" ? "Haunted Tellings (lore)" : s;
export const themeId = (s: string) => normalize(s).replaceAll(" ", "-");
export const themeUrl = (s: string) => "/themes/" + themeId(s);
export const stateUrl = (s: string) => "/states/" + s.toLowerCase();
export const area = (r: BrowseRow) => r.town || r.county || "Statewide";
export const countLabel = (n: number) => n + (n === 1 ? " entry" : " entries");
export const stopLabel = (s: string) =>
  (({ hunt: "Hunt", reflection: "Reflection", view: "View" })[s] || s) +
  " stops";
export const byTitle = (a: BrowseRow, b: BrowseRow) =>
  a.title.localeCompare(b.title, "en") || a.slug.localeCompare(b.slug);
export const byGround = (a: BrowseRow, b: BrowseRow) =>
  a.state.localeCompare(b.state) ||
  area(a).localeCompare(area(b)) ||
  byTitle(a, b);
let cached: BrowseRow[] | undefined;
export function catalog(): BrowseRow[] {
  return (cached ??= JSON.parse(
    readFileSync(join(process.cwd(), "data/navigation.json"), "utf8"),
  ) as BrowseRow[]);
}
export function query(raw: RawQuery): Query {
  return Object.fromEntries(
    Object.entries(raw).filter(
      (item): item is [string, string] => typeof item[1] === "string",
    ),
  );
}
export function url(base: string, params: Query = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v),
  ).toString();
  return base + (qs ? "?" + qs : "");
}
export function entryUrl(r: BrowseRow, ctx: Query = {}) {
  return url("/sites/" + encodeURIComponent(r.slug), ctx);
}
export function buckets(rows: BrowseRow[], keys: (r: BrowseRow) => string[]) {
  const index = new Map<string, BrowseRow[]>();
  for (const row of rows)
    for (const key of new Set(keys(row))) {
      if (!index.has(key)) index.set(key, []);
      index.get(key)!.push(row);
    }
  return [...index].sort(([a], [b]) => a.localeCompare(b, "en"));
}
export function grouped(rows: BrowseRow[], view: string) {
  return buckets(rows, (r) =>
    view === "theme" ? r.themes : [view === "stop" ? r.stopType : area(r)],
  );
}
export function inState(code?: string) {
  return code
    ? catalog().filter((r) => r.stateCode === code.toUpperCase())
    : catalog();
}
export function pageNumber(n: string | undefined, total: number, size = PAGE) {
  return Math.max(
    1,
    Math.min(Number.parseInt(n || "1", 10) || 1, Math.ceil(total / size)),
  );
}
export function themeList() {
  return [...new Set([...paths, ...catalog().flatMap((r) => r.themes)])];
}
export function areaContext(r: BrowseRow): Query {
  return { from: "area", state: r.stateCode, group: area(r) };
}
export function normalizeTheme(value: string) {
  return value === "Military" ? "Military Ground" : value;
}
export function searchScope(p: Query) {
  return inState(p.state).filter(
    (r) =>
      (!p.theme || r.themes.includes(normalizeTheme(p.theme))) &&
      (!p.stop || r.stopType === p.stop),
  );
}

export function search(rows: BrowseRow[], value: string) {
  const key = normalize(value);
  const terms = [...new Set<string>(key.split(" ").filter(Boolean))];
  const matches = key
    ? rows.filter((r) =>
        terms.every(
          (t) =>
            r.text.includes(t) ||
            (t === "lore" && r.themes.includes("Haunted Tellings")),
        ),
      )
    : [];
  const score = (r: BrowseRow) =>
    r.nameKey === key || r.recordedNameKey === key
      ? 0
      : r.nameKey.startsWith(key) || r.recordedNameKey.startsWith(key)
        ? 1
        : r.nameKey.includes(key) || r.recordedNameKey.includes(key)
          ? 2
          : r.townKey === key
            ? 3
            : 4;
  matches.sort((a, b) => score(a) - score(b) || byTitle(a, b));
  const towns = buckets(
    matches.filter((r) => r.townKey && r.townKey.includes(key)),
    (r) => [r.town + ", " + r.state],
  );
  const themes = buckets(matches, (r) =>
    r.themes.filter((t) => normalize(pathName(t)).includes(key)),
  );
  return { places: matches, towns, themes };
}

function distance(a: string, b: string) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const line = [i];
    for (let j = 1; j <= b.length; j++)
      line[j] = Math.min(
        line[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + Number(a[i - 1] !== b[j - 1]),
      );
    previous = line;
  }
  return previous[b.length];
}
export function suggestions(rows: BrowseRow[], value: string) {
  const key = normalize(value).slice(0, 80);
  const labels = new Set(
    rows.flatMap((r) => [r.town, r.title, r.recordedName]).filter(Boolean),
  );
  return [...labels]
    .map((label) => {
      const name = normalize(label);
      const score = distance(key, name);
      return { label, score };
    })
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.label.length - b.label.length ||
        a.label.localeCompare(b.label),
    )
    .slice(0, 5);
}

export function selection(p: Query): BrowseRow[] {
  const rows = inState(p.state);
  switch (p.from) {
    case "area":
      return rows.filter((r) => area(r) === p.group).sort(byTitle);
    case "theme":
      return rows.filter((r) => r.themes.includes(p.group)).sort(byGround);
    case "stop":
      return rows.filter((r) => r.stopType === p.group).sort(byGround);
    case "map":
      return rows.filter((r) => r.mapPoint).sort(byGround);
    case "route": {
      const slugs = new Set(
        getTour(p.group)
          ?.stops.map((s) => s.siteSlug)
          .filter(Boolean),
      );
      const lookup = new Map(rows.map((r) => [r.slug, r]));
      return [...slugs].flatMap((s) =>
        s && lookup.has(s) ? [lookup.get(s)!] : [],
      );
    }
    case "search": {
      const results = search(searchScope(p), p.q || "");
      if (p.part === "town" || p.part === "theme")
        return (
          (p.part === "town" ? results.towns : results.themes).find(
            ([k]) => k === p.group,
          )?.[1] || []
        );
      return results.places;
    }
    default:
      return [];
  }
}
export function moreGround(row: BrowseRow, limit = 4) {
  const others = catalog().filter((r) => r.slug !== row.slug);
  const local = others
    .filter(
      (r) => row.town && r.stateCode === row.stateCode && r.town === row.town,
    )
    .sort(byTitle);
  const shared = (r: BrowseRow) =>
    r.themes.filter((t) => row.themes.includes(t)).length;
  const related = others
    .filter((r) => shared(r) && !local.includes(r))
    .sort(
      (a, b) =>
        shared(b) - shared(a) ||
        Number(b.stateCode === row.stateCode) -
          Number(a.stateCode === row.stateCode) ||
        byTitle(a, b),
    );
  return [...local, ...related].slice(0, limit);
}

const regions: Record<string, string[]> = {
  West: "Alaska|Arizona|California|Colorado|Hawaii|Idaho|Montana|Nevada|New Mexico|Oregon|Utah|Washington|Wyoming".split(
    "|",
  ),
  Midwest:
    "Illinois|Indiana|Iowa|Kansas|Michigan|Minnesota|Missouri|Nebraska|North Dakota|Ohio|South Dakota|Wisconsin".split(
      "|",
    ),
  South:
    "Alabama|Arkansas|Delaware|District of Columbia|Florida|Georgia|Kentucky|Louisiana|Maryland|Mississippi|North Carolina|Oklahoma|South Carolina|Tennessee|Texas|Virginia|West Virginia".split(
      "|",
    ),
  Northeast:
    "Connecticut|Maine|Massachusetts|New Hampshire|New Jersey|New York|Pennsylvania|Rhode Island|Vermont".split(
      "|",
    ),
};
export function routeRegion(tour: Tour) {
  const names = tour.stops.map(
    (s) =>
      catalog().find((r) => r.slug === s.siteSlug)?.state ||
      s.place.split(",").at(-1)?.trim() ||
      "",
  );
  const found = new Set(
    names.map(
      (name) =>
        Object.keys(regions).find((k) => regions[k].includes(name)) ||
        "Other routes",
    ),
  );
  return found.size === 1 ? [...found][0] : "Across regions";
}
