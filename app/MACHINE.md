# Phase 1 — The Queue

The queue is the machine's work list. It is generated. Nothing in `data/machine/` is hand-edited. Phase 1 does not research, does not call a model, and does not open pull requests. Later phases read these files. They are not part of this phase.

## What is in the queue

Three JSON files, rebuilt together:

| File | Contents |
|---|---|
| `data/machine/research-queue.json` | Unfilled leads from the current lane sheets, desk sweep lists, and the current county-register controls, in work order. |
| `data/machine/verification-queue.json` | Every live catalog entry, oldest verified first. |
| `data/machine/photo-queue.json` | A JSON twin of `photo-gaps.csv` when that file is in the repo. Until then the status is `pending: gap report not on main` and the item list is empty. |

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

The photo gap report is `photo-gaps.csv`. Its generator is on open PR #3 (`photos-every-listing`) and is not on main. This phase does not copy that generator and does not touch PR #3. When `public/desk/photo-gaps.csv` or `data/photo-gaps.csv` is present, the photo queue becomes the CSV's rows with the CSV's own keys, in file order.

## Regenerate

From `app/`:

```
node scripts/convert.mjs
npm run queue:build
```

`npm run build` runs the converter, the existing map and hunt checks, then `scripts/check-machine-queue.mjs`. The check rebuilds all three queues in memory, validates their shape, and exits 1 with `MACHINE QUEUE CHECK FAILED` if a committed file differs from that rebuild.

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

## Phase 2 — The research worker

The desk owns `.github/workflows/machine-research.yml`; this patch does not add or enable it. The worker reads `machine/worker.config.json` for the provider, model, per-run cap, and schedule. The only accepted research route is OpenRouter's `nvidia/nemotron-3.5-super-vl:free`; the worker requests a zero input/output price limit and disables provider fallback. It does not use an automatic router, a paid model, or a backup credential. Free capacity can be exhausted or withdrawn; a failure stops the run rather than spending money.

`npm run check:worker` fails if the actual workflow is missing or its cron and secret mapping disagree with the worker. While the workflow is held by the desk, run `npm run check:worker -- --workflow /path/to/machine-research.yml` to check a copy explicitly. A test fixture can exercise this checker; it is not workflow installation or release evidence.

The config field `secretName` names the one inference credential, the GitHub Actions secret `MACHINE_RESEARCH_OPENROUTER_KEY` (Settings → Secrets and variables → Actions). The workflow maps it to the same-named environment variable. The repository's own GitHub token remains separate for GitHub operations. `MACHINE_BUILDER_KEY` is reserved for separate builder work: it is not configured, consumed, or exposed by this research runtime or workflow. An empty research secret is a clean stop: no provider request, issue, or pull request.

Send only public research material. This provider change does not add source acquisition, independent evidence verification, or publication authority.

The worker reads open pull requests whose head branch starts with `machine/research-run-` before it researches. Lead ids already named in those run reports are skipped, and the drafted dossiers count as filed ground for the variant check. That is what stops the two-hour schedule from filing the same lead again while a draft is still waiting. A run that cannot read those pull requests stops and files an issue. It does not guess.

### Kill switch

In the Actions tab, open **Machine research** and choose **Disable workflow**. You can also delete or rename `.github/workflows/machine-research.yml` and merge that change. Either one stops scheduled runs and manual runs. The queue, the catalog, and the live site do not change. A draft pull request already opened stays open until the desk closes or merges it. Nothing the worker wrote is published by the workflow itself.

### Rollback

Revert the Phase 2 commits. That removes the workflow, `machine/worker.config.json`, `lib/machine-worker.mjs`, `scripts/machine-research.mjs`, `scripts/check-machine-worker.mjs`, `scripts/machine-worker.test.mjs`, and the `check-machine-worker` build step. Phase 1 stays. Close any open `machine/research-run-*` pull requests the desk does not want. The converter and the published catalog are untouched. The schedule does not run until this workflow file is on `main`.

