# History Travel — hosted edition: architecture

Stage 1 (this build): scaffold, catalog data pipeline, and a passing local
build. No deployment, no accounts yet — those are Stage 2.

## Stack

- **Next.js 15 (App Router) + React 19 + TypeScript**, server-rendered with
  static generation for entry and desk pages.
- No CSS framework: one stylesheet (`app/globals.css`) carrying the
  "Gothic industry metal" look — charcoal `#24272C`, steel `#2E3238`,
  amber `#D99A26` / deep `#A8741A`, cream `#ECE5D3`, rivet silver `#9AA2A9`,
  slate `#103840`, pale steel `#D8E1E3` (values from
  `~/workspace/rimrock/branding/BRANDING.md`). No visible Rimrock branding;
  the product name is **On Old Ground** (settled by the owner Nov 20, 2026;
  formerly History Travel — the name is a config-level string in
  `lib/seo.ts`, not baked into the data). Canonical domain:
  https://onoldground.com (the history-travil.vercel.app address remains
  live on the same project).

## Data pipeline

`scripts/convert.mjs` (runs standalone as `npm run convert` and as the first
step of `npm run build`):

1. Reads every dossier in `~/workspace/history-travel/corpus/` plus the four
   home-bench dossiers at `~/workspace/history-travel/`, deduplicated by slug
   with the latest revision winning (the U250 R02 revisions of Bayhorse,
   Cataldo, and Murray supersede their originals).
2. Parses each dossier's sections — three shapes exist in the wild: the
   standard 10-part template, a variant with §1 as a bold header line, and a
   home-bench titled-section scheme. Sections are mapped by title keywords
   first, numbers second; any section that maps nowhere is carried through
   verbatim in `moreSections` so no dossier content is silently dropped.
3. Emits `data/sites.json` (full entries), `data/index.json` (lightweight
   rows for browse/search), and `data/stats.json` (the conversion report).

Fidelity rules enforced by the converter (from `PUBLISH_CORPUS_MANIFEST.md`
and the product law, Update 252):

- The dossier's own words carry over; nothing is invented or smoothed.
- Locator fields and coordinates are filled only where the dossier's cited
  source prints them; blanks stay blank.
- **§8 apparatus is never surfaced.** The blank "Answer:"/"Key:" scaffolding
  and question-shaped prompts in candidate-finds sections are the trivia
  shape the product law rules out. Only declarative, apparatus-free
  candidate lines survive, verbatim, labelled "not yet field-checked or
  activated". Reflection dossiers contribute no find elements at all, and
  variant-scheme candidate sections (Lewiston LD-01, St. Joe §6, Celilo §5)
  are withheld entirely — they are individually gated in the record.
- Stop type is `reflection` where the dossier designates it (slug, preamble,
  gate, or candidate-section designation) and `view` otherwise. Corpus
  entries are never typed `hunt`: scored hunts are not activated from the
  corpus (manifest rule 5).
- Themes are derived by keyword tagging over title + story against a
  controlled vocabulary in the converter — a finding aid, not a claim about
  the site. Towns are taken only from the dossier's printed address or the
  known home-bench set; otherwise the field stays blank.

## Data layer

`lib/data.ts` is the only module that knows where data comes from. Pages
call `getSites()`, `getSite(slug)`, `getIndex()`, `getStats()`,
`getStates()`, `getThemes()`. Stage 2 replaces the JSON loaders behind this
interface with database queries — no page rewrites.

## Pages

- `/` — front door only: positioning, four entry points, how-it-works,
  state list. No content pile.
- `/catalog` — browse + search with state / theme / stop-type filters;
  tappable rows to entries.
- `/sites/[slug]` — one page per entry: trip gate (access) first, candidate
  photo finds where lawful, story, then/now, what's still there, stop
  progression, carried sections, locator record, honest gaps, photo record
  and sources (collapsible).
- `/desk` — Research Desk as an index of tappable rows; `/desk/[slug]`
  serves the guide documents, one file per state, and the national file.
- `/hunts` — the three hunts (Pulaski, Valley, Mining Country) presented as
  photo-tag scavenger hunts, read-only in Stage 1.
- `/maps` — the historic map library (see `MAPS.md`): sheets grouped by
  state → place, filter by type and era; `/maps/[id]` sheet pages with zoom
  in place; entries and routes show their tied sheets oldest first.
- `/tours` — states plainly that the seven tour records live in the app
  record, not in the research files, and are not reconstructed here.

## Known gaps (Stage 1)

- **Originals' app metadata**: the Muse app's 23 original entries carry
  structured extras (photo pairs, hunt find definitions, planner data) that
  do not exist in the workspace files; the dossiers behind most of them are
  in the corpus and converted. Catalog total here is 235 dossier-derived
  entries vs the app's 248 (23 originals + 225 corpus publishes) — the
  difference is app-side records, not missing dossiers.
- **Desk documents**: the app's 11 guide documents' full text lives only in
  the Muse app record. This edition's Desk carries four guides written from
  the governing documents (manifest fidelity rules, product law, QC summary)
  plus generated state/national files.
- **Tours**: no tour data in the source files; see `/tours`.
- **Reflection typing is heuristic** (83 typed reflection vs 88 in the app
  record); the signals are the dossiers' own designations, and mistyping
  risk runs toward `view`. Every QC-named reflection site checks out.
- **Then/now photo pairs** are not in the dossier files and are not rendered.

## Stage 2 — as built (Nov 19, 2026)

Built in the repo, NOT deployed. The app reads `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` from the environment; with them absent it
builds and runs unconfigured — reading fully functional, every saving
feature dormant behind an honest "saving is not connected yet" state
(`components/SavingGate.tsx` is the single gate). No local-storage fallback
exists anywhere: unconnected means nothing is persisted, by design.

- **Schema:** `supabase/migrations/20261119000000_stage2_schema.sql` — profiles
  (auto-created on sign-up), sites (converter-shaped, public-read, ingest-only
  writes), plans + plan_items, checkins, stamps (a VIEW derived from
  checkins, `security_invoker`), notebook, field_reports, study_requests
  (both `pending_qc` candidates), photo_submissions (pending-approval queue),
  private storage buckets `scrapbook` + `submissions` with folder-per-user
  policies. RLS on every table, owner-only. Checkins deliberately carry NO
  score/points columns.
- **Auth:** email magic link (Supabase Auth), `lib/account.tsx` provider +
  `app/auth/callback/route.ts` code exchange. No middleware: no server page
  depends on a session, so static generation is untouched.
- **Saving:** `lib/saving.ts` (typed ops) wired into `components/SiteActions.tsx`
  (plan add/remove, per-entry notebook, field report), `components/ClaimFind.tsx`
  (photo tag: photo upload to the scrapbook bucket + claim row with the
  optional claim-point position), and `app/account/page.tsx` (the scrapbook:
  plans, tags, stamp book, notebook, candidates with their review states,
  study-request form).
- **Location:** `lib/geo.ts` + `app/near/page.tsx`. Position is requested ONLY
  on the player's tap, used once in-tab, never sent or stored. Only entries
  with recorded coordinates AND a derivable visitable anchor are listed.
  Claim-time position is the single stored coordinate, and only the claim's.
- **The visitable anchor (owner's ruling, Nov 19, 2026):** every entry is
  tied to ground a reader can go to. `getVisitableAnchor()` in `lib/data.ts`
  derives it from the dossier's locator record only (public-anchor fields →
  printed address → recorded point → site operator; archives are sources,
  never anchors). Entry pages carry a "Where you go" panel (name, approach,
  printed boundary); catalog/Desk rows carry the approach badge. When no
  anchor is derivable the entry is NOT dropped and none is invented — the
  page says so and the entry is flagged for the owner's Desk ruling.
  **As built: 193 of 235 entries carry a derived anchor; 42 are flagged**
  (list in the Stage 2 build report; the ingest script prints the same list
  when run). The ingest script (`scripts/ingest-sites.mjs`) mirrors the rule
  into `sites.anchor_*` columns and exits honestly when its keys are absent.
- **Historic location as information:** entry pages print the dossier's
  historic-location fields in a "Where it was" panel — text only, never a
  map point, never directions.
- **Then/now:** the dossier's then/now record renders on every entry page.
  Where the photo record names a historic "then" with no obtained "now",
  the entry carries ground that is visitable, and it is not reflection
  ground, `thenNowInvitation()` shows `components/CompleteThePair.tsx` — a
  signed-in submission into the pending-approval queue. The dataset carries
  no image assets and no structured photo pairs, so the invitation derives
  from the dossier's photo-record prose (conservative; see report).
- **Stage 3 (not done here):** run the migration against the provisioned
  project (ref pkvroqouiukqhojozxlf), wire the env vars via Vercel's
  "Connect to Project", add the production /auth/callback URL to Supabase
  Auth's redirect allowlist, run the ingest, deploy, and only then prove
  saving end-to-end (magic link → plan → photo tag → stamp).

## Stage 2 plan — accounts + database (needs Gene)

Goal: the same app, publicly hosted, where a visitor's plans, photo-tag
check-ins, stamp book, and notebook save to their own account.

1. **Hosting**: deploy this Next.js app to Gene's **Vercel** account
   (already connected). Needs Gene's go and a click-through on the project
   import; domain (a History Travel domain TBD — the product name is still
   open) attaches there.
2. **Database**: provision Postgres through Vercel Marketplace — options:
   **Neon** or **Supabase** (both offer a Vercel integration; Supabase also
   bundles auth/storage). Provisioning creates a vendor account under
   Gene's Vercel — **needs Gene's approval/click**; Dash cannot create
   external accounts for him.
3. **Auth**: email magic-link or OAuth via the chosen provider (Supabase
   Auth) or **Clerk**/**Auth.js** if Neon is chosen. Sign-in is only for
   saving; reading the reference stays open and ungated (the access law:
   simple access is the product).
4. **Schema**: `sites` (the converter's JSON shape becomes the seed/ingest
   format — the converter stays as the ingest pipeline), `users`,
   `plans`, `checkins` (photo-tag claims), `stamps`, `notebook`,
   `field_reports` (stored as candidates flagged pending QC, per the
   growth law), `study_requests`.
5. **Migration of app state**: the Muse app's saved data (plans, check-ins)
   is Gene's own; export/import is a Stage 2 task once the schema exists.
6. **What does not change**: the converter, the fidelity rules, the page
   structure, and `lib/data.ts`'s interface.
