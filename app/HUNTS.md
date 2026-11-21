# Hunts tab — how it works (data-driven rebuild, Nov 21, 2026)

The Hunts tab renders at build time from two files the desk already
publishes: `data/hunts.json` (hand-maintained) and `data/sites.json`
(regenerated from the corpus by `scripts/convert.mjs` on every build).
The rules live in `lib/hunts-core.mjs`; the pages read them through
`lib/data.ts` (`getResolvedHunts`), and `scripts/check-hunts.mjs` enforces
them in `npm run build`. Unit tests: `npm run test:hunts`.

## The law, in code

1. **Being there is the tag (Ruling 4).** No question gates. A find
   advances hunt progress and badges ONLY when the check-in captured a
   real device location at the tap (`claim_lat` and `claim_lon` finite). A
   location-less visit is saved to the player's scrapbook only and counts
   toward nothing. No demo, default, or fallback location exists anywhere.
   A photo is optional and goes to the player's private `scrapbook` bucket.
2. **Every counted find is tied — per find, by ground (Ruling 3).** A find
   is TIED when:
   - its `entrySlug` is a published catalog entry (primary), OR
   - a single published entry claims that find's `groundKey` in its dossier
     locator (`**Hunt ground:** wallace-tool-museum`, or `**App site:**
     <groundKey>`), consistent with any `App site:` on the entry, OR
   - `appSite` is unshared across all hunts and a single published entry
     declares `**App site:** <appSite>`.
   A shared `appSite` (e.g. `wallace-tool`, shared by Pulaski Find 3 and
   Find 5; `lewiston-mill`, shared by Valley Find 2 and Find 3) NEVER
   auto-ties all finds carrying it. Untied finds show **"catalog entry in
   preparation"** and are excluded from tied/total, completion and badges.
3. **Reflection ground never carries a find (Ruling 1).** Any find tied to
   an entry with `stopType: "reflection"`, or to a slug/appSite in the
   owner's reflection denylist (`ID-sunshine-miners-memorial` /
   `sunshine-mine`), fails the build (`check-hunts.mjs`) and never renders
   as tied.
4. **No hunt copy is written by code.** Labels, tasks, hints and ground names
   print exactly as `hunts.json` carries them.
5. The founding hunts stay `active`.

## When the desk publishes a new entry

Nothing to edit in `hunts.json`. If the entry covers an untied find's
ground:
- If its slug matches the find's `entrySlug`, it ties automatically.
- If the find's `appSite` is unshared (e.g. `clearwater-bridge`), declaring
  `**App site:** clearwater-bridge` in the dossier locator ties it.
- If the find shares an `appSite` with another find (e.g. `wallace-tool`
  or `lewiston-mill`), the dossier must also name the specific per-find
  `groundKey` via `**Hunt ground:** <groundKey>` (e.g.
  `**Hunt ground:** wallace-tool-museum` for Pulaski Find 3; Find 5
  `pulaski-in-service` stays untied).

On the next build the find ties itself, the counts and tier recompute, and
the entry page's tag panel offers the find.

## Difficulty tiers (the rule, applied in code)

Only tied finds count. For each tied find's catalog entry:

- **On foot** — the visitable anchor's own wording names a trail, trailhead,
  hike, or "miles each way".
- **Seasonal** — the Before-you-go text names seasonal access (seasonal,
  winter closure, snow closure, summer only, open only in…, Memorial
  Day–Labor Day).
- **Remote** — the anchor or Before-you-go text names high-clearance,
  four-wheel/4x4, boat-only, fly-in, or backcountry access.
- **Spread** — the greatest straight-line distance between the tied
  entries' recorded points.

| Tier | Name | Rule |
|---|---|---|
| 4 | Almost unobtainable | any seasonal or remote ground |
| 3 | Hard going | any on-foot ground, or spread over 60 miles |
| 2 | Day out | two or more roadside grounds within 60 miles |
| 1 | Roadside | one roadside ground (or all within a mile) |
| — | Not yet rated | no tied finds |

The tier recomputes every build, so it moves when an untied find ties.

## Adding a themed hunt (Stage 2 — data only)

1. Pick a theme id from `data/hunt-themes.json` (founding: `fire-service`,
   `timber-rail`, `mining`; Stage 2 ready: `lighthouse`, `railroad`,
   `logging-fire`). A new theme is one more row in that file.
2. Add the hunt object to `data/hunts.json` with `theme` and `region`, and
   finds with unique `groundKey` values whose ground, task and hint come
   from the tied entries' dossiers.
3. Build. The check fails on an unknown theme, a missing region, duplicate
   find numbers or `groundKey`s, an ambiguous claim, or any find on
   reflection ground.

No code changes. No new hunts are published by this change.
