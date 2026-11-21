// HISTORIC MAP LIBRARY — core rules, shared by the pages (through
// lib/data.ts) and the build-time check (scripts/check-maps.mjs).
//
// Data: data/historic-map-library.json — the library file as filed by the
// map lane (v2 now; a later version is swapped in by replacing this one
// file). Shape: { sheets[], ties[], schemaNotes, backCompat }.
//
// Rules the code holds to (from the library briefs and the file's own
// schemaNotes):
//   • Real sheets only. Nothing here generates, crops or retouches an image;
//     the page shows image.src from the holding institution or Commons.
//   • A point renders ONLY for a tie whose status is "checked", at its stored
//     x/y — percentages of the full image, origin top-left. Any other tie
//     shows the sheet plain: no marker, no implied position.
//   • A sheet whose image.src is null is "pending conversion": listed, never
//     shown as an image (no broken image, no temporary host).
//   • Blanks stay blank: a null field prints as nothing, never a guess.

export const IMAGE_HOSTS = ["tile.loc.gov", "upload.wikimedia.org"];

/** Ties the round-1 checks took OFF. A position may come back only with a
 *  new held-out check; until the desk removes a line here, the build fails
 *  if either renders a point. */
export const HELD_OFF = [
  { entrySlug: "lewiston-main-street", reason: "611 Main (Liberty Theater): fixed but no independent held-out check" },
  { entrySlug: "MS-house-on-ellicott-hill", reason: "sources disagree between 211 and 215 N. Canal" },
];

export function hasPoint(tie) {
  return tie.status === "checked" && !!tie.position;
}

/** A sheet is pending conversion when it has no display src, or when the
 *  library marks it `pending-conversion-upload`. source.sourceFiles (GeoTIFF
 *  etc.) and plannedSrcAfterUpload are never display images. */
export const PENDING_IMAGE_STATUS = "pending-conversion-upload";

export function isPending(sheet) {
  if (!sheet.image) return true;
  if (sheet.image.status === PENDING_IMAGE_STATUS) return true;
  return !sheet.image.src;
}

/** Era label from dateSort ("1916-04" → "1910s"). */
export function eraOf(sheet) {
  const y = parseInt(String(sheet.dateSort || "").slice(0, 4), 10);
  return Number.isFinite(y) ? `${Math.floor(y / 10) * 10}s` : "Undated";
}

/** All ties for one entry slug or tour id, oldest sheet first. */
export function tiesFor(library, key) {
  const byId = new Map(library.sheets.map((s) => [s.id, s]));
  return library.ties
    .filter((t) => t.entrySlug === key)
    .map((t) => ({ tie: t, sheet: byId.get(t.sheetId) }))
    .filter((x) => x.sheet)
    .sort((a, b) => String(a.sheet.dateSort).localeCompare(String(b.sheet.dateSort)) || a.sheet.id.localeCompare(b.sheet.id));
}

/** The v1 record (src, alt, caption, credit, sourceName, sourceUrl,
 *  dateNote) rebuilt from a tie, per the file's backCompat.mapping. Returns
 *  null for a pending sheet (no figure). */
export function toV1(tie, sheet) {
  if (isPending(sheet)) return null;
  const rec = {
    src: sheet.image.src,
    alt: sheet.alt,
    caption: tie.caption ?? sheet.caption,
    credit: sheet.credit,
    sourceName: sheet.sourceName ?? `Library of Congress — Sanborn Maps Collection, item ${sheet.source.itemId}`,
    sourceUrl: sheet.source.pageUrl,
    dateNote: tie.dateNote ?? sheet.limitsNote,
  };
  return rec;
}

export function libraryCounts(library) {
  const ties = library.ties;
  return {
    sheets: library.sheets.length,
    ties: ties.length,
    points: ties.filter(hasPoint).length,
    noPoint: ties.filter((t) => !hasPoint(t)).length,
    pending: library.sheets.filter(isPending).length,
    places: new Set(library.sheets.map((s) => `${s.place.state}|${s.place.town}`)).size,
    states: new Set(library.sheets.map((s) => s.place.state)).size,
  };
}

/** Validate the library against the catalog. Returns problems (empty = pass).
 *  @param v1 the frozen v1 historic-maps.json (migration proof), or null */
export function checkLibrary(library, siteSlugs, tourIds, v1) {
  const P = [];
  const ids = new Set();
  for (const s of library.sheets) {
    if (ids.has(s.id)) P.push(`duplicate sheet id ${s.id}`);
    ids.add(s.id);
    for (const k of ["title", "date", "dateSort", "type", "credit", "limitsNote"]) if (!s[k]) P.push(`${s.id}: missing ${k}`);
    if (!s.place || !s.place.state || !s.place.town) P.push(`${s.id}: missing place.state/town`);
    if (!s.source || !s.source.pageUrl) P.push(`${s.id}: missing source.pageUrl`);
    if (!s.coverage || !s.coverage.basis) P.push(`${s.id}: missing coverage.basis`);
    if (s.image && s.image.status === PENDING_IMAGE_STATUS && s.image.src) {
      P.push(`${s.id}: image.status is pending-conversion-upload but image.src is set — keep src null until the file is hosted`);
    }
    const sourceFileUrls = new Set(Object.values((s.source && s.source.sourceFiles) || {}).filter((v) => typeof v === "string" && /^https?:/.test(v)));
    if (s.image && s.image.src && sourceFileUrls.has(s.image.src)) {
      P.push(`${s.id}: image.src must not be a source.sourceFiles URL (GeoTIFF/GeoPDF/thumbnail are not display images)`);
    }
    if (isPending(s)) {
      if (!(s.image && (s.image.displayDerivativeNeeded || s.image.status === PENDING_IMAGE_STATUS))) P.push(`${s.id}: image.src is null but neither displayDerivativeNeeded nor status pending-conversion-upload is set`);
    } else {
      let host = "";
      try {
        const u = new URL(s.image.src);
        host = u.protocol === "https:" ? u.hostname : "";
      } catch {}
      if (!IMAGE_HOSTS.includes(host)) P.push(`${s.id}: image.src host "${host || s.image.src}" is not a stable holding-institution host (${IMAGE_HOSTS.join(", ")})`);
      if (!(s.image.width > 0 && s.image.height > 0)) P.push(`${s.id}: image width/height missing`);
    }
  }
  for (const t of library.ties) {
    const where = `tie ${t.sheetId} → ${t.entrySlug}`;
    if (!ids.has(t.sheetId)) P.push(`${where}: no such sheet`);
    if (t.entryKind === "site" && !siteSlugs.has(t.entrySlug)) P.push(`${where}: no such catalog entry`);
    if (t.entryKind === "tour" && !tourIds.has(t.entrySlug)) P.push(`${where}: no such route`);
    if (t.entryKind !== "site" && t.entryKind !== "tour") P.push(`${where}: entryKind must be site or tour`);
    if (t.status === "checked") {
      const p = t.position;
      if (!p || !(p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100)) P.push(`${where}: checked tie needs a position within 0–100%`);
    } else if (t.status === "no-point-by-rule") {
      if (t.position) P.push(`${where}: no-point tie carries a position`);
    } else {
      P.push(`${where}: status "${t.status}" is not renderable (checked | no-point-by-rule)`);
    }
    const held = HELD_OFF.find((h) => h.entrySlug === t.entrySlug);
    if (held && hasPoint(t)) P.push(`${where}: point was taken off in round 1 (${held.reason}) and must stay off`);
  }
  if (v1) {
    for (const [key, rec] of Object.entries(v1)) {
      const found = tiesFor(library, key);
      if (found.length !== 1) {
        P.push(`migration: v1 key ${key} has ${found.length} ties in the library (expected 1)`);
        continue;
      }
      const { tie, sheet } = found[0];
      if (hasPoint(tie)) P.push(`migration: ${key} must have no point`);
      const rebuilt = toV1(tie, sheet);
      for (const f of ["src", "alt", "caption", "credit", "sourceName", "sourceUrl", "dateNote"]) {
        if ((rebuilt && rebuilt[f]) !== rec[f]) P.push(`migration: ${key}.${f} differs from v1`);
      }
    }
  }
  return P;
}
