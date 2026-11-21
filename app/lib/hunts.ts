import type { Site, VisitableAnchor } from "./data";
import { haversineKm, type LatLon } from "./geo";

type Access = "roadside" | "walk" | "hike" | "remote";
type Seed = {
  id: string; entrySlug: string; ground: string; place: string; sourceNote: string;
  catalogNames?: string[]; evidence?: string; task?: string; hint?: string;
  access?: Access; seasonal?: boolean; legacyLabels?: string[]; vicinityKm?: number;
};
export type HuntSeed = {
  slug: string; name: string; theme: string; region: string; area: string;
  badge: string; status: string; finds: Seed[]; related: { slug: string; label: string }[];
};
export type HuntFind = {
  id: string; entrySlug: string | null; ground: string; place: string; task: string;
  hint: string; legacyLabels: string[]; point: LatLon | null; vicinityKm: number | null;
  access: Access; seasonal: boolean;
};
export type Hunt = Omit<HuntSeed, "finds"> & { finds: HuntFind[]; tied: number; tier: string };

// Only currently playable ground sets the badge difficulty. Distances are
// maximum straight-line separation between recorded catalog points, not road mileage.
export const tierRules = [
  "Almost unobtainable — remote or season-limited access.",
  "Demanding — a hike or at least 80 km between recorded sites.",
  "Regional — more than one site, or at least 10 km between recorded points.",
  "Local walk — one site reached on foot.",
  "Easy roadside — one drive-up site."
];

function tierFor(finds: HuntFind[]) {
  const tied = finds.filter(f => f.entrySlug);
  if (!tied.length) return "Awaiting catalog ground";
  if (tied.some(f => f.seasonal || f.access === "remote")) return "Almost unobtainable";
  let span = 0;
  for (const [i, a] of tied.entries()) {
    for (const b of tied.slice(i + 1)) {
      if (a.point && b.point) span = Math.max(span, haversineKm(a.point, b.point));
    }
  }
  if (span >= 80 || tied.some(f => f.access === "hike")) return "Demanding";
  if (span >= 10 || new Set(tied.map(f => f.entrySlug)).size > 1) return "Regional";
  return tied.some(f => f.access === "walk") ? "Local walk" : "Easy roadside";
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function resolveHunts(seeds: HuntSeed[], sites: Site[], anchorOf: (s: Site) => VisitableAnchor | null): Hunt[] {
  const bySlug = new Map(sites.map(s => [s.slug, s]));
  const huntIds = new Set<string>();
  return seeds.filter(h => h.status === "active").map(h => {
    if (!/^[a-z0-9-]+$/.test(h.slug) || huntIds.has(h.slug)) throw new Error("Invalid or duplicate hunt slug: " + h.slug);
    huntIds.add(h.slug);
    const finds: HuntFind[] = [];
    const ids = new Set<string>();
    for (const f of h.finds) {
      if (!/^[a-z0-9-]+$/.test(f.id) || ids.has(f.id)) throw new Error("Invalid or duplicate hunt find: " + h.slug + "/" + f.id);
      ids.add(f.id);
      let site = bySlug.get(f.entrySlug);
      if (!site && f.catalogNames?.length) {
        const names = f.catalogNames.map(normalize);
        const matches = sites.filter(s => s.stateCode === f.entrySlug.split("-")[0] &&
          [s.locator.stableName, s.title].some(n => names.includes(normalize(n))));
        if (matches.length === 1) site = matches[0];
      }
      if (site?.stopType === "reflection") continue;
      const anchor = site && anchorOf(site);
      const playable = site && anchor;
      const record = site ? [site.access, site.stillThere, site.progression, site.story, site.photoRecord].join(" ") : "";
      // If a revision withdraws the cited ground, keep its place on the list
      // while withholding the stale invitation and all badge credit.
      const supported = !f.evidence || record.toLowerCase().includes(f.evidence.toLowerCase());
      const tied = Boolean(playable && supported);
      const access = site?.access || "";
      const method = f.access ?? (anchor?.approach === "hike" ? "hike" : anchor?.approach === "drive-up" ? "roadside" : "walk");
      finds.push({
        id: f.id, entrySlug: tied ? site!.slug : null, ground: f.ground, place: f.place,
        task: tied ? f.task || "Find the public stop named in the entry: " + anchor!.name : "",
        hint: tied ? f.hint || anchor!.boundary || access.replace(/\*\*/g, "") || anchor!.name : "",
        legacyLabels: f.legacyLabels ?? [], point: tied ? site!.coordinates : null,
        vicinityKm: f.vicinityKm ?? null, access: method,
        seasonal: f.seasonal ?? /open seasonally|seasonal access|closed (?:in|during|for) (?:the )?winter/i.test(access)
      });
    }
    return { ...h, finds, related: h.related.filter(r => bySlug.has(r.slug)),
      tied: finds.filter(f => f.entrySlug).length, tier: tierFor(finds) };
  });
}
