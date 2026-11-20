import { getPlainTop, getVisitableAnchor, type Site } from "@/lib/data";

// ---------------------------------------------------------------------------
// SEO foundation (Nov 20, 2026): the catalog is found through search, one
// entry at a time, so every entry page carries its own title, description,
// canonical URL and structured data. Everything here is derived from the
// entry's own record — the dossier's words, trimmed, never rewritten and
// never supplemented. Blank stays blank: no coordinates, no address parts,
// no claims the dossier does not print.
// ---------------------------------------------------------------------------

export const SITE_URL = "https://history-travil.vercel.app";
export const SITE_NAME = "History Travel";
export const SITE_DESCRIPTION =
  "A historical road trip reference built from primary sources — researched deep, honest about its gaps, with a scavenger hunt layered on the record.";

/** Strip dossier markdown down to plain prose for search metadata. */
export function plainText(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images keep their alt text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links keep their label
    .replace(/\[\d+\]/g, "") // citation markers like [1], [2][3]
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Trim to at most `max` chars, preferring a sentence end, else a word end. */
export function trimForMeta(text: string, max = 155): string {
  if (text.length <= max) return text;
  const window = text.slice(0, max);
  const sentence = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "));
  if (sentence > max * 0.55) return window.slice(0, sentence + 1);
  const word = window.lastIndexOf(" ");
  return (word > 0 ? window.slice(0, word) : window).trimEnd() + "…";
}

/**
 * The entry's meta description, from its own text in the order the page
 * presents it: the plain top's first paragraph, then the dossier's
 * standfirst, then its lead, then the story's opening. Nothing is composed.
 */
export function entryDescription(site: Site): string {
  const plainTop = getPlainTop(site.slug);
  const topParagraph = plainTop?.sections[0]?.paragraphs?.[0] ?? "";
  // A few standfirsts open with the researcher's check stamp ("Checked
  // 19 November 2026. Local research dossier. …") — that is apparatus, not
  // the entry's prose, so those standfirsts are passed over for the story.
  const standfirst = /^(checked\b|local research dossier\b|research dossier\b)/i.test(
    plainText(site.standfirst)
  )
    ? ""
    : site.standfirst;
  let raw = topParagraph || standfirst || site.lead || site.story || "";
  let text = plainText(raw);
  // Story openings carry a bolded label ("One-minute hook:") — the label is
  // apparatus, not prose; the sentence after it is the entry's own words.
  text = text.replace(/^One-minute hook:\s*/i, "");
  if (!text) {
    // Last resort is still the record: the title plus where it stands.
    text = `${site.title} — ${site.town ? `${site.town}, ` : ""}${site.state}.`;
  }
  // Typographic only: a description starts with a capital, even where the
  // label strip left the sentence's continuation first.
  text = text.charAt(0).toUpperCase() + text.slice(1);
  return trimForMeta(text);
}

export function entryUrl(site: Site): string {
  return `${SITE_URL}/sites/${site.slug}`;
}

/**
 * schema.org structured data for one entry. Place for everything;
 * TouristAttraction only where the entry is a view stop whose dossier names
 * lawful public ground a visitor can go to (the derived visitable anchor).
 * Reflection ground and anchorless entries stay Place — the record does not
 * offer them as attractions. Geo appears only where the entry actually
 * carries coordinates. No hours, offers, or ratings: the dossiers do not
 * print them as structured claims, so neither do we.
 */
export function entryJsonLd(site: Site) {
  const anchor = getVisitableAnchor(site);
  const isAttraction = site.stopType === "view" && anchor !== null;
  const address: Record<string, string> = {
    "@type": "PostalAddress",
    addressRegion: site.state,
    addressCountry: "US",
  };
  if (site.town) address.addressLocality = site.town;
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": isAttraction ? "TouristAttraction" : "Place",
    name: site.title,
    description: entryDescription(site),
    url: entryUrl(site),
    address,
  };
  if (site.coordinates) {
    ld.geo = {
      "@type": "GeoCoordinates",
      latitude: site.coordinates.lat,
      longitude: site.coordinates.lon,
    };
  }
  return ld;
}

/** Site-level structured data for the front door. */
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
  };
}
