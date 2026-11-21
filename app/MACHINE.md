# Phase 1 — The Queue

The queue is the machine's work list. It is generated. Nothing in `data/machine/` is hand-edited. Phase 1 does not research, does not call a model, and does not open pull requests. Later phases read these files. They are not part of this phase.

## What is in the queue

Three JSON files, rebuilt together:

| File | Contents |
|---|---|
| `data/machine/research-queue.json` | Unfilled leads from the current lane sheets, desk sweep lists, and the current county-register controls, in work order. |
| `data/machine/verification-queue.json` | Every live catalog entry, oldest verified first. |
| `data/machine/photo-queue.json` | All incomplete photo records, in the order written by the photo desk, including archival-only records. |

Each research item has a stable id, a projected slug, a target slug when reconciliation finds a dossier, the name, town, county, postal state, tier, anchor posture as filed, every source reference that collapsed into the item, a queue state, and an `attempts` array. Phase 1 always writes `attempts` as `[]`. The state `working` is reserved for a later worker. This generator does not emit it.

## Sources

Frozen snapshots of the current Drive exports live in `desk/machine-sources/`, with `MANIFEST.md`. The generator reads only the current file list in `lib/machine-queue.mjs` (`CURRENT_SOURCE_FILES`). The lane-state file is prose and contributes no rows.

These superseded exports are listed in the manifest and were **not** copied into the repo. They are not queue sources:

- `LEAD-SHEET-AL-2026-11-21.md` (superseded by the Alabama r2 sheet)
- `LEAD-SHEET-TN-2026-11-21.md` (superseded by the Tennessee r2 sheet)
- `LEAD-SHEET-KY-2026-11-21.md` (superseded by the Kentucky r2 sheet)
- `LEAD-SHEET-TN-2026-11-21-Fort-Campbell.md` (both leads are already on the Tennessee r2 sheet)
- `GA-2026-11-21-County-Register-Control.csv` (superseded by the Georgia r2 control)
- `FL-2026-11-21-County-Register-Control.csv` (superseded by the Florida r2 control)

The live catalog is the corpus plus `data/sites.json` from `scripts/convert.mjs`. This phase does not change the converter. `data/sites.json` is generated at build time and is not committed. `data/index.json` and `data/stats.json` stay as they were; a local build rewrites them and they should be restored if that rewrite is not itself the change under review.

The photo desk writes `public/desk/photo-gaps.csv` in the npm `postconvert` step. The queue copies every column and row in file order. A checkout with neither this report nor its `data/photo-gaps.csv` fallback yields an empty, pending photo queue.

Only `public/desk/field-photo-targets.csv` supplies public field options. Each row carries a reviewed viewpoint or permitted subject. Desk-review and archival-only rows stay at the desk. A public-ground record that already has a current image also stays at the desk for its historical image.

## Regenerate

From `app/`:

```
npm run convert
npm run queue:build
```

`npm run build` runs conversion and photo coverage, rebuilds navigation, runs the map and hunt checks, then runs `scripts/check-machine-queue.mjs`. The check rebuilds all three queues in memory, validates their shape, and exits 1 with `MACHINE QUEUE CHECK FAILED` if a committed file differs from that rebuild.

`npm run test:queue` runs the queue tests (`node --test`).

## Work order

Documented in `lib/machine-queue.mjs`:

1. **Seeding.** Items whose postal state has zero entries in `sites.json`. Tier 1, then 2, then 3, then 4, then unknown. Inside a tier, march order, then lead id.
2. **Depth.** Items whose state already has a live entry. March order, then tier, then lead id.

March blocks, states in the order written: AL TN KY, GA FL SC NC, IL IN OH, MI WI, VA WV MD DE, PA NY NJ, ME VT NH MA CT RI (New England, the order in `New-England-first-sweep.md`), AK. Any other state sorts after Alaska, by postal code.

The sheets do not carry a second "most visited" rank, so tier is the seeding rank. A state with even one live entry is depth, including a state that also has a large unfilled lead list.

## Queue states

| State | Meaning in Phase 1 |
|---|---|
| `queued` | An unfilled lead. A later worker takes the first of these. |
| `working` | Not written by this generator. |
| `filed` | The lead matches a corpus dossier that is absent from `sites.json`. |
| `published` | The lead matches a live `sites.json` entry. |
| `checked-dead` | A source marked the ground dead (`DEAD`, `DEAD-LEAD`, or "checked dead"). Dead wins over queued when any merged source says so, unless reconciliation finds the live catalog. |
| `held` | Every creator source is held (`OUT-OF-SCOPE-FOR-NOW`). One real lead among the sources lifts the item back to queued. |

Desk `HAVE` / `HAVE-LEAD` rows, Finder rows whose place or flags are `HAVE`, `XREF` rows (including "see Wave" and "previously filed"), and haunted `LISTED` rows never create an item. When they name the same ground as an item, they are kept on that item as extra source references.

The lead id is `lq_` plus the first 16 hex characters of SHA-256 over the normalized state, town, county, name, and the canonical source file (the creator source with the earliest file name, then line). Normalization is documented in `lib/machine-queue.mjs`.

Duplicates collapse when they share a state and a register id, or a state and a normalized name with compatible town and county. A filled town does not merge with a different filled town. Florida register rows whose disposition is `OPEN` stay queued: the county is not closed and the row is not yet on a wave sheet. Georgia and Florida control rows that share a register id with a sheet row collapse onto that row.

A lead matches a dossier only when the normalized name equals the catalog title, the locator's stable site name, or the slug read as words. Towns must agree when both sides have one. A shorter name does not claim a longer title.

Verification order uses the first `Checked <date>` in the dossier (`November 19, 2026`, `19 November 2026`, `Nov. 20, 2026`, or `YYYY-MM-DD`). No such line sorts first (`verifiedOn: null`, source `unrecorded`), then the date, then the slug.

## Rollback

Phase 1 has no runtime behavior on the site. To remove it, revert this branch's commit. That deletes `desk/machine-sources/`, `data/machine/`, `lib/machine-queue.mjs`, `scripts/build-machine-queue.mjs`, `scripts/check-machine-queue.mjs`, `scripts/machine-queue.test.mjs`, this file, and the `check-machine-queue` step in `package.json`. The catalog, converter, and pages are unchanged.

## Kill switch

Phase 1 has no workflows. There is nothing to disable. Later phases must name their workflow files here before they are allowed to run.
