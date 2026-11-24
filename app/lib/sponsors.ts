// ---------------------------------------------------------------------------
// SPONSORS — the foundation for sponsorship on On Old Ground.
//
// Sponsors buy labeled visibility, never content: a sponsor entry changes
// nothing about any entry, ranking, or page it appears beside. The block is
// rendered by components/SponsorBlock.tsx from this list alone — adding a
// future sponsor (or retiring one) is a config change here, never a rebuild
// of the component.
//
// Sponsor #1 is the house sponsor, Silver Queen Stoneworks (owner's ruling,
// Nov 23, 2026). Its creative is the shop's own stone photography, served
// from the shop's own site. On Old Ground's historical photographs are never
// used in sponsor creative — they stay in their editorial context, under
// their citations, exactly as published.
//
// GEO-TARGETING (per the Local Sponsor Offer, Nov 23, 2026): local sponsors
// are scoped to the ground they serve — a town, a state, or named entries —
// so a café in Cottonwood appears on Cottonwood ground, not sprayed
// site-wide. The rotation rule, implemented in getSponsorsForContext below:
// on a page for a piece of ground, render (1) any exclusive town sponsor,
// else (2) entry- and town-scoped sponsors for that ground in rotation,
// then (3) site-scope sponsors as fill. The footer/homepage block, which
// has no ground of its own, rotates all active sponsors.
// ---------------------------------------------------------------------------

export type SponsorScope = "site" | "town" | "state" | "entries";

/** founding | single | exclusive are the local tiers in the sponsor offer;
 *  house is the founder's own sponsor (Silver Queen), which runs under the
 *  identical rules. */
export type SponsorTier = "house" | "founding" | "single" | "exclusive";

export interface Sponsor {
  /** Stable identifier, used as the React key and in markup. */
  id: string;
  /** Disclosure label printed above the sponsor's name. The standing label
   *  is "Sponsored by" — visibility is always labeled, never dressed as
   *  content. */
  label: string;
  name: string;
  tagline: string;
  copy: string;
  linkUrl: string;
  linkText: string;
  image: {
    src: string;
    alt: string;
  };
  /** The ground this sponsor is placed on. "site" = everywhere (house and
   *  global sponsors); "town" / "state" / "entries" = local placement. */
  scope: SponsorScope;
  /** Town scope key, matched against the catalog's town/state fields.
   *  Required when scope is "town"; stateCode also keys "state" scope. */
  town?: string;
  stateCode?: string;
  /** Explicit catalog entry ids for entry-scoped placement; overrides and
   *  adds to town scope. */
  entryIds?: string[];
  /** Town/Area Exclusive: when true on a town scope, no other town-scoped
   *  sponsor is shown on that town's pages. */
  exclusive: boolean;
  tier: SponsorTier;
  /** Optional placement window (ISO dates, yyyy-mm-dd) so month-to-month
   *  terms can start and stop placements without code changes. */
  activeFrom?: string;
  activeTo?: string;
  /** Inactive sponsors stay in the list as the record and render nowhere. */
  active: boolean;
}

export const sponsors: Sponsor[] = [
  {
    id: "silver-queen-stoneworks",
    label: "Sponsored by",
    name: "Silver Queen Stoneworks",
    tagline: "Where Nature Becomes Art.",
    copy: "A real piece of the earth, cut and finished in the Lewis-Clark Valley.",
    linkUrl: "https://silverqueenstoneworks.com",
    linkText: "Visit the shop",
    image: {
      src: "https://silverqueenstoneworks.com/assets/agate-hero-wide.webp",
      alt: "A Brazilian agate slab from Silver Queen Stoneworks, held up to the light — amber banding around a broad cream center, the dark rind of the original stone tracing its edge",
    },
    scope: "site",
    exclusive: false,
    tier: "house",
    active: true,
  },
];

/** Active means switched on AND inside the placement window, when one is
 *  set. Dates compare as ISO strings (yyyy-mm-dd) against today's date. */
export function getActiveSponsors(now: Date = new Date()): Sponsor[] {
  const today = now.toISOString().slice(0, 10);
  return sponsors.filter(
    (s) =>
      s.active &&
      (!s.activeFrom || s.activeFrom <= today) &&
      (!s.activeTo || s.activeTo >= today)
  );
}

/** A page's ground, for geo-targeted placement. Entry pages know all three;
 *  town and state pages know the fields they collect by. */
export interface SponsorContext {
  town?: string;
  stateCode?: string;
  entryId?: string;
}

function sameTown(s: Sponsor, ctx: SponsorContext): boolean {
  return (
    !!ctx.town &&
    !!s.town &&
    s.town.toLowerCase() === ctx.town.toLowerCase() &&
    (!s.stateCode || !ctx.stateCode || s.stateCode === ctx.stateCode)
  );
}

/**
 * Sponsors for a page, in placement order, honoring the rotation rule:
 * an exclusive town sponsor stands alone on its town's ground; otherwise
 * entry-scoped matches lead, then the town rotation, then state scope,
 * with site-scope sponsors as fill. With no context, every active sponsor
 * rotates (the homepage/footer case).
 */
export function getSponsorsForContext(
  ctx?: SponsorContext,
  now: Date = new Date()
): Sponsor[] {
  const active = getActiveSponsors(now);
  if (!ctx || (!ctx.town && !ctx.stateCode && !ctx.entryId)) return active;

  const exclusiveTown = active.filter(
    (s) => s.scope === "town" && s.exclusive && sameTown(s, ctx)
  );
  if (exclusiveTown.length > 0) return exclusiveTown;

  const entryScoped = active.filter(
    (s) =>
      s.scope === "entries" &&
      !!ctx.entryId &&
      !!s.entryIds &&
      s.entryIds.includes(ctx.entryId)
  );
  const townScoped = active.filter((s) => s.scope === "town" && sameTown(s, ctx));
  const stateScoped = active.filter(
    (s) => s.scope === "state" && !!ctx.stateCode && s.stateCode === ctx.stateCode
  );
  const siteScoped = active.filter((s) => s.scope === "site");
  return [...entryScoped, ...townScoped, ...stateScoped, ...siteScoped];
}
