// HUNTS CORE — the rules of the Hunts tab, in one place, shared by the pages
// (through lib/data.ts), the progress UI (components/HuntProgress.tsx), and
// the build-time check (scripts/check-hunts.mjs).
//
// Pure functions over the two data files the desk already publishes:
//   data/hunts.json  — the hunts and their finds (hand-maintained)
//   data/sites.json  — the catalog, regenerated from the corpus at build time
// plus data/hunt-themes.json, the theme vocabulary (data, not code).
//
// Nothing here writes hunt copy. Labels, tasks, hints and ground names are
// carried from hunts.json exactly as written.

/** Slugs designated reflection ground by owner ruling (e.g. disaster
 *  memorials) even before the corpus dossier is retyped from view to
 *  reflection. A find placed on any of these fails the build. */
export const REFLECTION_SLUG_DENYLIST = new Set([
  "ID-sunshine-miners-memorial",
]);

/** App-site IDs designated reflection ground by owner ruling. */
export const REFLECTION_APP_SITES = new Set([
  "sunshine-mine",
]);

/** Reflection ground as designated in the catalog or by owner ruling. */
export function isReflectionSite(site) {
  return !!site && (site.stopType === "reflection" || REFLECTION_SLUG_DENYLIST.has(site.slug));
}

export function isReflectionSlugOrAppSite(entrySlug, appSite) {
  return (
    (!!entrySlug && REFLECTION_SLUG_DENYLIST.has(entrySlug)) ||
    (!!appSite && REFLECTION_APP_SITES.has(appSite))
  );
}

/** Locator keys a catalog entry uses to claim a hunt find's ground:
 *    - `App site:`    — the original app's site ID (`wallace-tool`, …)
 *    - `Hunt ground:` — the per-find ground key (`wallace-tool-museum`, …)
 *  A shared appSite never auto-ties every find carrying it; it resolves
 *  only to the specific find whose `groundKey` the dossier claims. */
export const APP_SITE_KEY = "App site";
export const HUNT_GROUND_KEY = "Hunt ground";

function clean(v) {
  return String(v || "").replace(/\*\*/g, "").trim();
}

function splitValues(v) {
  return clean(v).split(/[,;]\s*/).filter(Boolean);
}

/** Index the catalog once, along with which appSites are shared across hunts. */
export function indexCatalog(sites, hunts = []) {
  const bySlug = new Map();
  const byAppSite = new Map();
  const byGroundKey = new Map();
  const appSiteCounts = new Map();

  for (const h of hunts) {
    for (const f of h.finds || []) {
      if (f.appSite) appSiteCounts.set(f.appSite, (appSiteCounts.get(f.appSite) || 0) + 1);
    }
  }

  for (const s of sites) {
    bySlug.set(s.slug, s);
    const extra = (s.locator && s.locator.extra) || [];
    const appSites = [];
    const huntGrounds = [];
    for (const e of extra) {
      const k = e.key.trim().toLowerCase();
      if (k === APP_SITE_KEY.toLowerCase()) appSites.push(...splitValues(e.value));
      else if (k === HUNT_GROUND_KEY.toLowerCase()) huntGrounds.push(...splitValues(e.value));
    }
    const entry = { site: s, appSites, huntGrounds };
    for (const id of appSites) {
      const list = byAppSite.get(id) || [];
      list.push(entry);
      byAppSite.set(id, list);
    }
    for (const gk of huntGrounds) {
      const list = byGroundKey.get(gk) || [];
      list.push(entry);
      byGroundKey.set(gk, list);
    }
  }
  return { bySlug, byAppSite, byGroundKey, appSiteCounts };
}

/**
 * Resolve one find's tie to the catalog, at build time, from the data alone:
 *   0. Reflection guard: a find targeting a reflection-denylisted slug/appSite
 *      never ties and returns status `reflection` (fails the build).
 *   1. Primary (`entrySlug`): when `find.entrySlug` is a published catalog
 *      entry, the find ties to it.
 *   2. Per-find ground claim (`groundKey`): when a single entry claims
 *      `find.groundKey` via `Hunt ground: <groundKey>` (or via
 *      `App site: <groundKey>` directly, when `groundKey` is distinct from a
 *      shared `appSite`), AND any `App site:` on that entry is consistent
 *      with `find.appSite` / `find.groundKey`, only THIS find ties to it.
 *   3. Unshared `appSite` claim: when `find.appSite` belongs to ONLY this
 *      find across all hunts (`appSiteCounts.get(find.appSite) <= 1`), a
 *      single entry declaring `App site: <appSite>` (without a conflicting
 *      `Hunt ground:`) ties it.
 *   4. Shared `appSite` without a matching per-find `Hunt ground`: stays
 *      `untied` — never auto-ties every find sharing `appSite`.
 *
 * @returns {{ status: "tied"|"untied"|"reflection"|"ambiguous", site: any|null, via: string }}
 */
export function resolveFind(find, catalogIndex) {
  const { bySlug, byAppSite, byGroundKey, appSiteCounts } = catalogIndex;
  if (isReflectionSlugOrAppSite(find.entrySlug, find.appSite)) {
    const site = find.entrySlug ? bySlug.get(find.entrySlug) || null : null;
    return { status: "reflection", site, via: "reflection denylist (owner ruling)" };
  }

  let site = null;
  let via = "";
  const isSharedAppSite = !!find.appSite && (appSiteCounts.get(find.appSite) || 0) > 1;

  if (find.entrySlug && bySlug.has(find.entrySlug)) {
    site = bySlug.get(find.entrySlug);
    via = "entrySlug";
  } else if (find.groundKey) {
    // Explicit Hunt ground claim, or App site set directly to the unique groundKey.
    const fromGround = (byGroundKey.get(find.groundKey) || []).filter(
      (e) => e.appSites.length === 0 || e.appSites.includes(find.appSite) || e.appSites.includes(find.groundKey),
    );
    const fromDirectAppSite = (byAppSite.get(find.groundKey) || []).filter(
      (e) =>
        (!isSharedAppSite || find.groundKey !== find.appSite) &&
        (e.huntGrounds.length === 0 || e.huntGrounds.includes(find.groundKey)),
    );
    const matches = [...new Map([...fromGround, ...fromDirectAppSite].map((e) => [e.site.slug, e])).values()];
    if (matches.length > 1) {
      return { status: "ambiguous", site: null, via: `Hunt ground ${find.groundKey} claimed by ${matches.map((e) => e.site.slug).join(", ")}` };
    }
    if (matches.length === 1) {
      site = matches[0].site;
      via = matches[0].huntGrounds.includes(find.groundKey) ? "Hunt ground" : "App site (groundKey)";
    }
  }

  if (!site && !isSharedAppSite && find.appSite && byAppSite.has(find.appSite)) {
    const matches = (byAppSite.get(find.appSite) || []).filter(
      (e) => e.huntGrounds.length === 0 || (find.groundKey && e.huntGrounds.includes(find.groundKey)),
    );
    if (matches.length > 1) {
      return { status: "ambiguous", site: null, via: `App site ${find.appSite} declared by ${matches.map((e) => e.site.slug).join(", ")}` };
    }
    if (matches.length === 1) {
      site = matches[0].site;
      via = "App site";
    }
  }

  if (!site) {
    const reason = isSharedAppSite && find.appSite && byAppSite.has(find.appSite)
      ? `shared appSite '${find.appSite}' requires per-find Hunt ground '${find.groundKey}'`
      : find.entrySlug
        ? `entrySlug ${find.entrySlug} not published yet`
        : "";
    return { status: "untied", site: null, via: reason };
  }
  if (isReflectionSite(site)) return { status: "reflection", site, via };
  return { status: "tied", site, via };
}

// ---------------------------------------------------------------------------
// RULING 4 — ONLY LOCATION-CAPTURED CHECK-INS ADVANCE HUNT PROGRESS & BADGES.
// A visit without captured coordinates is scrapbook-only and counts toward
// nothing. No demo, default, or fallback location exists anywhere.
// ---------------------------------------------------------------------------
export function hasCapturedLocation(checkin) {
  return (
    !!checkin &&
    typeof checkin.claim_lat === "number" &&
    typeof checkin.claim_lon === "number" &&
    Number.isFinite(checkin.claim_lat) &&
    Number.isFinite(checkin.claim_lon) &&
    checkin.claim_lat >= -90 &&
    checkin.claim_lat <= 90 &&
    checkin.claim_lon >= -180 &&
    checkin.claim_lon <= 180
  );
}

export function checkedFindKeys(checkins) {
  return new Set(
    (checkins || [])
      .filter(hasCapturedLocation)
      .map((c) => `${c.site_slug}::${c.find_label}`),
  );
}

export function computeHuntProgress(finds, checkins) {
  const tied = (finds || []).filter((f) => !!f.tiedSlug);
  const keys = checkedFindKeys(checkins);
  const done = tied.filter((f) => keys.has(`${f.tiedSlug}::${f.label}`)).length;
  return {
    tied: tied.length,
    done,
    complete: tied.length > 0 && done === tied.length,
    checkedKeys: keys,
  };
}

// ---------------------------------------------------------------------------
// DIFFICULTY TIERS — the rule, as written (applied in code, never per hunt):
//
// Only TIED finds count: an untied find has no catalog ground to judge.
// For each tied find the rule reads its catalog entry:
//   • access   — the visitable anchor's own wording (lib/data.ts
//                getVisitableAnchor → name): a trail, a trailhead, a hike,
//                "miles each way" → ON FOOT. Everything else is ROADSIDE.
//   • season   — the entry's Before-you-go text names seasonal access
//                (seasonal, winter closure, snow, summer only, open only
//                certain months, Memorial Day–Labor Day) → SEASONAL.
//   • remote   — the anchor or Before-you-go text names remote access
//                (high-clearance, four-wheel / 4x4, boat-only, fly-in,
//                backcountry) → REMOTE.
//   • distance — the greatest straight-line distance between the recorded
//                points of the hunt's tied entries (miles).
// Tier:
//   4 Almost unobtainable — any SEASONAL or REMOTE ground.
//   3 Hard going          — any ON-FOOT ground, or finds spread more than
//                           60 miles apart.
//   2 Day out             — two or more grounds, all roadside, within 60 miles.
//   1 Roadside            — one ground (or every ground within a mile),
//                           roadside.
//   Not yet rated         — no tied finds yet.
// The tier recomputes on every build, so it moves when an untied find ties.
// ---------------------------------------------------------------------------
export const TIERS = {
  1: { n: 1, name: "Roadside", plain: "One stop you can drive up to." },
  2: { n: 2, name: "Day out", plain: "Several stops you can drive to, within 60 miles of each other." },
  3: { n: 3, name: "Hard going", plain: "A trail walk, or stops spread more than 60 miles apart." },
  4: { n: 4, name: "Almost unobtainable", plain: "Seasonal or remote ground." },
};

const ON_FOOT = /\btrail(head)?\b|\bhike\b|\bhiking\b|miles? each way|round[- ]trip walk/i;
const SEASONAL =
  /\bseasonal(ly)?\b|closed (in|for|during) (the )?winter|winter closure|snow[- ]?(bound|closed|closure)|summer only|open only (in|from)|memorial day (to|through|–|-) labor day/i;
const REMOTE = /high[- ]clearance|four[- ]wheel|\b4x4\b|boat[- ]only|by boat only|fly[- ]in|backcountry/i;

function milesBetween(a, b) {
  const R = 3958.8;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  const dLon = toR(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function tierFor(tiedSites, anchorOf, nameOf = (s) => s.slug) {
  const grounds = [...new Map(tiedSites.map((s) => [s.slug, s])).values()];
  if (grounds.length === 0) return { tier: null, reasons: ["No find is tied to a catalog entry yet."], factors: null };
  let onFoot = [], seasonal = [], remote = [];
  for (const s of grounds) {
    const a = anchorOf(s);
    const anchorText = a ? a.name : "";
    const access = s.access || "";
    if (ON_FOOT.test(anchorText)) onFoot.push(nameOf(s));
    if (SEASONAL.test(access) || SEASONAL.test(anchorText)) seasonal.push(nameOf(s));
    if (REMOTE.test(access) || REMOTE.test(anchorText)) remote.push(nameOf(s));
  }
  const pts = grounds.map((s) => s.coordinates).filter(Boolean);
  let spread = 0;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) spread = Math.max(spread, milesBetween(pts[i], pts[j]));
  const unlocated = grounds.length - pts.length;
  const reasons = [];
  let tier;
  if (seasonal.length || remote.length) {
    tier = 4;
    if (seasonal.length) reasons.push(`Seasonal access: ${seasonal.join(", ")}`);
    if (remote.length) reasons.push(`Remote access: ${remote.join(", ")}`);
  } else if (onFoot.length || spread > 60) {
    tier = 3;
    if (onFoot.length) reasons.push(`On foot: ${onFoot.join(", ")}`);
    if (spread > 60) reasons.push(`Spread ${Math.round(spread)} miles`);
  } else if (grounds.length > 1 && (spread > 1 || unlocated > 0)) {
    tier = 2;
    reasons.push(`${grounds.length} roadside grounds within ${Math.max(1, Math.round(spread))} miles`);
  } else {
    tier = 1;
    reasons.push(grounds.length === 1 ? "One roadside ground" : "Every ground within a mile, roadside");
  }
  if (unlocated) reasons.push(`${unlocated} tied ${unlocated === 1 ? "ground has" : "grounds have"} no recorded point; distance uses the rest`);
  return {
    tier,
    reasons,
    factors: { grounds: grounds.length, onFoot, seasonal, remote, spreadMiles: Math.round(spread * 10) / 10, unlocated },
  };
}

/** Hunt-level counts, computed — the page prints these, never a literal. */
export function huntCounts(resolvedFinds) {
  const total = resolvedFinds.length;
  const tied = resolvedFinds.filter((f) => f.tie.status === "tied").length;
  return { total, tied, untied: total - tied };
}

/** Validate hunts.json + hunt-themes.json against the catalog. Returns a
 *  list of problems (empty = pass). Used by scripts/check-hunts.mjs. */
export function checkHunts(hunts, sites, themes) {
  const problems = [];
  const idx = indexCatalog(sites, hunts);
  const themeIds = new Set(themes.map((t) => t.id));
  const slugs = new Set();
  const groundKeys = new Set();
  for (const h of hunts) {
    if (slugs.has(h.slug)) problems.push(`Duplicate hunt slug ${h.slug}`);
    slugs.add(h.slug);
    for (const k of ["slug", "name", "badge", "theme", "region", "status"]) if (!h[k]) problems.push(`${h.slug}: missing ${k}`);
    if (h.theme && !themeIds.has(h.theme)) problems.push(`${h.slug}: theme "${h.theme}" is not in data/hunt-themes.json`);
    const ns = new Set();
    for (const f of h.finds || []) {
      if (ns.has(f.n)) problems.push(`${h.slug}: duplicate find number ${f.n}`);
      ns.add(f.n);
      if (!f.label || !f.task) problems.push(`${h.slug} find ${f.n}: missing label or task`);
      if (!f.groundKey) problems.push(`${h.slug} find ${f.n}: missing groundKey`);
      else if (groundKeys.has(f.groundKey)) problems.push(`${h.slug} find ${f.n}: duplicate groundKey ${f.groundKey}`);
      else groundKeys.add(f.groundKey);
      const r = resolveFind(f, idx);
      if (r.status === "reflection") {
        const who = r.site ? r.site.slug : f.entrySlug || f.appSite;
        problems.push(`${h.slug} find ${f.n} ties to REFLECTION ground ${who} (${r.via}) — reflection ground never carries a find`);
      }
      if (r.status === "ambiguous") problems.push(`${h.slug} find ${f.n}: ${r.via} — one ground, one entry`);
    }
  }
  return problems;
}
