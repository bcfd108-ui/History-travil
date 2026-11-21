import { createHash } from "node:crypto";

export const archiveGap = "no lawful ground photo — not a field task";

// Pin a field invitation to the actual access and locator record reviewed by the desk.
// New or revised records need a fresh decision before they can issue invitations.
export function accessRevision(site) {
  const fields = [site.id, site.title, site.town, site.stateCode, site.access, site.locator,
    site.stopType, site.stillThere, site.progression, site.photoRecord, site.moreSections, site.gaps];
  return createHash("sha256").update(JSON.stringify(fields)).digest("hex");
}

export function photoEligibility(site, finding) {
  const review = finding?.groundReview;
  const anchor = site.locator?.extra?.find(f => /^public anchor$/i.test(f.key))?.value ?? "";
  const gate = (site.access ?? "").replaceAll("*", "").trim();
  const noAnchor = /\bno (?:verified |lawful |ordinary |current )*(?:public |walk-up )?(?:anchor|viewpoint|standing point)\b/i;
  const restricted = /^(?:(?:access|visit|visits|entry)\s*[:—-]?\s*)?(?:appointment[- ]only|by appointment only|closed to (?:visitors|the public)|private (?:ground|property)|gated)\b/i;
  const namedExterior = (anchor && /(?:sidewalk|public street|overlook|viewpoint|roadside memorial)/i.test(anchor))
    || /(?:from (?:the |a )?public (?:sidewalk|street|overlook)|verified (?:public )?exterior (?:viewpoint|anchor))/i.test(gate);
  if (/^(?:none\b|no[ -]anchor\b)/i.test(anchor)
    || /^(?:no[ -]anchor\b|no lawful public anchor\b|archive[- ]only\b|remote reading only\b|reading-only until\b)/i.test(gate)
    || review?.status === "ARCHIVAL-ONLY") return "ARCHIVAL-ONLY";
  if (review?.status === "PUBLIC GROUND" && review.viewpoint?.trim()
    && review.revision === accessRevision(site)) return "PUBLIC GROUND";
  if (!namedExterior && (noAnchor.test(gate) || (!anchor && restricted.test(gate)))) return "ARCHIVAL-ONLY";
  return "DESK REVIEW";
}

export function coverageFor(photos) {
  const roles = new Set(photos.map(p => p.eraRole));
  if (roles.size === 2) return "complete pair";
  if (roles.has("then")) return "then-only";
  if (roles.has("now")) return "now-only";
  return "none";
}
