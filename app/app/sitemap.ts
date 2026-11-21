import type { MetadataRoute } from "next";
import { getHunts, getSites, getStates, getTours } from "@/lib/data";
import { DESK_GUIDES } from "@/lib/content";
import {stateUrl,themeList,themeUrl} from "@/lib/browse";
import { SITE_URL } from "@/lib/seo";

// The sitemap is derived from the same data the pages are built from, so it
// grows with the catalog on its own: every entry page, every Desk document
// (guides, one file per state, the national file), and every tour.
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    priority,
  });

  return [
    page("/", 1),
    page("/catalog", 0.9),
    page("/map",0.8),
    page("/themes",0.8),
    ...getStates().map(s=>page(stateUrl(s.code),0.8)),
    ...themeList().map(t=>page(themeUrl(t),0.8)),
    page("/desk", 0.8),
    page("/hunts", 0.8),
    page("/tours", 0.8),
    page("/near", 0.7),
    ...DESK_GUIDES.map((d) => page(`/desk/${d.slug}`, 0.6)),
    ...getStates().map((s) => page(`/desk/state-${s.code.toLowerCase()}`, 0.6)),
    page("/desk/national", 0.6),
    ...getTours().map((t) => page(`/tours/${t.id}`, 0.7)),
    ...getHunts().map((h) => page(`/hunts/${h.slug}`, 0.7)),
    ...getSites().map((s) => page(`/sites/${s.slug}`, 0.6)),
  ];
}
