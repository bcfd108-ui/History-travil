import type { Site, VisitableAnchor } from "./data";
import { haversineKm, type LatLon } from "./geo";

type Access = "roadside" | "walk" | "hike" | "remote";
type Seed = {
  id: string; entrySlug: string | null; targetEntrySlug?: string; label: string; groundName: string; place: string; sourceNote: string;
  task: string; hint: string;
  access?: Access; seasonal?: boolean; legacyLabels?: string[]; vicinityKm?: number;
};
export type HuntSeed = {
  slug: string; name: string; theme: string; region: string; area: string;
  badge: string; status: string; finds: Seed[]; related: { slug: string; label: string }[];
};
export type HuntFind = {
  id: string; entrySlug: string | null; label: string; ground: string; place: string; task: string;
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
      // A reserved slug identifies pending ground without publishing a tie.
      // Several distinct field tasks may resolve to the same dossier.
      const target = f.entrySlug ?? f.targetEntrySlug;
      const site = target ? bySlug.get(target) : undefined;
      if (site?.stopType === "reflection") continue;
      const anchor = site && anchorOf(site);
      const tied = Boolean(site && anchor);
      const access = site?.access || "";
      const method = f.access ?? (anchor?.approach === "hike" ? "hike" : anchor?.approach === "drive-up" ? "roadside" : "walk");
      finds.push({
        id: f.id, entrySlug: tied ? site!.slug : null, label: f.label, ground: f.groundName, place: f.place,
        task: f.task, hint: f.hint,
        legacyLabels: [f.label, ...(f.legacyLabels ?? [])], point: tied ? site!.coordinates : null,
        vicinityKm: f.vicinityKm ?? null, access: method,
        seasonal: f.seasonal ?? /open seasonally|seasonal access|closed (?:in|during|for) (?:the )?winter/i.test(access)
      });
    }
    return { ...h, finds, related: h.related.filter(r => bySlug.has(r.slug)),
      tied: finds.filter(f => f.entrySlug).length, tier: tierFor(finds) };
  });
}
