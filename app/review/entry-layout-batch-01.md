# Entry layout · Arizona and baseline checks

Base revision `96c7d4b2e38696a651525b8a86fd28a9be372731`. The converter rebuilt 701 entries across 23 states from this revision. The previously committed index counted 675. All counts below use the rebuilt catalog.

## Coverage

| Measure | Before | This branch |
|---|---:|---:|
| Reviewed plain tops | 7 | 36 |
| Entries rendering Good to know | 0 | 36 |
| Photo records on this base | 5 | 5 |
| Complete Then / Now pairs | 0 | 0 |

The first state batch covers Arizona’s 24 entries. Eleven Idaho entries exercise all seven existing plain tops and five existing photographs, with one entry in both sets. Saltair adds Utah’s archive-only and demolished-pavilion case. The remaining 665 entries retain their previous access card pending editorial extraction. Arkansas is the next state on this revision.

## Mobile acceptance

Chromium 153, production Next.js build, 360 × 640 CSS pixels, default font size. Measurements are relative to the top of the screen. Each of the 36 pages showed at least the first line of story copy before scrolling. All 15 hard warnings occupied a single rendered line directly beneath the title. The remaining 21 had no warning. All 191 displayed rows matched their reviewed values in order. The table followed actions and preceded the three final disclosures. The comparison included every row, every existing top paragraph and bullet, and the captions, credits and item links for all five photographs.

| Named entry | Coverage case | First story paragraph, y | Longest record paragraph or quotation (words) | Quotation blocks | Table rows |
|---|---|---:|---:|---:|---:|
| `AZ-bisbee-deportation-reflection` | Reflection, museum anchor, missing photo | 318 px | 54 | 1 | 10 |
| `AZ-clifton-morenci-worker-households` | Anchored reflection, worker testimony | 289 px | 57 | 1 | 8 |
| `AZ-hopi-public-history` | Remote reflection, one-row table | 318 px | 59 | 2 | 1 |
| `AZ-tubac-print-workers` | Public museum, accessible areas | 261 px | 54 | 0 | 8 |
| `AZ-tucson-barrio-preservation` | Demolished neighborhood, surviving museum anchor | 318 px | 56 | 2 | 5 |
| `ID-city-of-rocks-california-trail` | Historic photograph, surviving inscriptions | 576 px | 60 | 1 | 6 |
| `ID-craters-of-the-moon` | Photograph, cave closure | 600 px | 60 | 2 | 4 |
| `ID-idaho-city` | Historic photograph, seasonal museum | 530 px | 58 | 2 | 5 |
| `ID-three-island-crossing` | Modern photograph, land-only visit | 516 px | 60 | 1 | 7 |
| `UT-saltair-amusement-workers` | Demolished pavilion, reading only | 289 px | 54 | 1 | 4 |
| `st-joe-st-maries` | Existing photograph and plain top | 602 px | 54 | 13 | 4 |

Across all 36 pages the maximum was 60 words per paragraph, with zero visible numeric citation markers in the reading layer. Every selected passage of testimony appeared in a quotation block. Names in quotation marks and titles stay in running text. The source list still renders from the original dossier. All contents links resolved. The search-context route also passed the Bisbee contents-and-source check and the Saltair reading-only check.

## Photographs and existing copy

The source branch carries seven plain tops and five photo records. The brief also mentions five tops and seven photos. All records actually present on the branch were tested. The seven earlier tops retain all of their original sentences. Their prior visiting notes remain in the original-access disclosure.

All five credited images decoded in Chromium. Two Commons thumbnail URLs were updated to working renditions of the same files. The City of Rocks display uses the original Library of Congress JPEG from its CDN, saved byte-for-byte with this change. The remaining two images use the existing source URLs. Captions, dates, rights, attributions, item links and entry assignments were compared against the base. Image requests in the browser check used the environment’s network proxy to retrieve the actual external image bodies.

The pair renderer passed separate component tests for a missing photograph, a single photograph, an incomplete pair, a lead included in a pair and a separate lead followed by a pair. Public records contained no approved pair to test end-to-end.

## Reading and small tables

Every reading-only entry in the batch is listed below, along with anchored reflection entries with four or fewer rows. Archive appointments stay under Research access.

| Slug | Mode | Rows |
|---|---|---:|
| `AZ-hopi-public-history` | Reading only | 1 |
| `AZ-phoenix-black-community` | Conditional public museum tour | 4 |
| `AZ-phoenix-mexican-american-community` | Reading only | 3 |
| `AZ-phoenix-womens-suffrage` | Reading only | 6 |
| `AZ-poston-reflection` | Reading only | 3 |
| `AZ-tohono-oodham-public-history` | Reading only | 2 |
| `UT-saltair-amusement-workers` | Reading only | 4 |

Other tables with four or fewer rows are `ID-bovill`, `ID-burke`, `ID-craters-of-the-moon`, `ID-nine-mile-cemetery`, `ID-pulaski-tunnel-trail`, `ID-sunshine-miners-memorial`, `ID-wallace-brick-core`, `st-joe-st-maries`.

## Row evidence for this batch

Each label below identifies the exact converted dossier field behind its displayed value. Bracketed numbers identify paragraphs starting at one. Named locator extras identify the matching key. The ledger pins the digest of every cited field. A changed passage or edited value fails the build and cannot qualify that record for the reviewed layout.

Run `node scripts/check-entry-facts.mjs --report` from `app/` after conversion for the full label, value and field crosswalk. Append a state code to restrict the report to that state. The unchanged source passages can also be read in each page’s final disclosure.

| Slug | Displayed label → dossier field |
|---|---|
| `AZ-apache-public-history` | Go to → `locator.stableName` · Address → `locator.address` · Hours → `access[1]` · Website → `sources[1]` · Closed → `access[1]`, `access[2]` · Where you may stand → `access[3]`, `access[4]` · Check before you go → `access[1]`, `access[2]` |
| `AZ-bisbee-deportation-reflection` | Warning → `access[4]` · Go to → `locator.stableName` · Address → `locator.extra.Printed public institutional locator` · Hours → `access[1]` · Admission → `access[1]` · Phone → `access[1]` · Website → `sources[1]` · Closed → `access[2]` · Where you may stand → `locator.extra.Permanent rule`, `access[4]` · Research access → `access[3]` · Check before you go → `access[2]` |
| `AZ-clifton-morenci-worker-households` | Go to → `locator.stableName` · Address → `locator.address` · Hours → `access[1]` · Admission → `access[1]` · Phone → `access[1]` · Website → `sources[1]` · Where you may stand → `locator.address`, `access[1]` · Research access → `access[3]` |
| `AZ-dine-weavers-public-history` | Go to → `locator.stableName` · Address → `locator.address` · Hours → `access[1]` · Admission → `access[1]`, `access[2]` · Website → `sources[1]` · Closed → `access[1]` · Where you may stand → `access[4]` |
| `AZ-douglas-border-households` | Go to → `locator.stableName` · Address → `locator.address` · Hours → `access[1]`, `access[2]` · Website → `sources[1]` · Where you may stand → `access[1]`, `access[3]` · Check before you go → `access[1]` |
| `AZ-flagstaff-observatory-workers` | Go to → `locator.extra.Public anchor` · Address → `locator.address` · Hours → `access[1]` · Admission → `access[1]` · Website → `sources[1]` · Closed → `access[1]` · Where you may stand → `locator.extra.Visitor boundary`, `access[3]` · Check before you go → `access[4]` |
| `AZ-grand-canyon-havasupai-public-history` | Go to → `locator.stableName` · Address → `locator.address` · Hours → `access[1]` · Website → `sources[1]` · Where you may stand → `access[4]` · Accessibility → `access[2]` |
| `AZ-holbrook-roadside-workers` | Warning → `access[3]` · Go to → `locator.extra.Public anchor` · Address → `locator.address` · Hours → `access[1]` · Admission → `access[1]` · Website → `sources[1]` · Where you may stand → `access[2]`, `access[3]`, `locator.extra.Visitor boundary` · Research access → `access[4]` |
| `AZ-hopi-public-history` | Warning → `access[1]` · Go to → `access[1]` |
| `AZ-jerome-worker-households` | Go to → `locator.extra.Public anchor` · Address → `locator.address` · Hours → `access[1]` · Admission → `access[1]` · Website → `sources[1]` · Where you may stand → `locator.extra.Visitor boundary` · Research access → `access[4]` · Check before you go → `access[4]` |
| `AZ-mesa-migrant-farm-households` | Go to → `locator.extra.Public anchor` · Address → `locator.address` · Hours → `access[1]` · Website → `sources[1]` · Closed → `access[1]` · Where you may stand → `access[2]`, `access[4]` · Accessibility → `access[2]` · Research access → `access[3]` · Check before you go → `access[2]` |
| `AZ-phoenix-black-community` | Warning → `access[1]` · Go to → `locator.extra.Official manager/operator`, `access[1]` · Website → `sources[9]` · Where you may stand → `access[1]` · Research access → `access[1]` |
| `AZ-phoenix-mexican-american-community` | Warning → `access[1]`, `access[3]` · Go to → `access[1]`, `access[3]` · Website → `sources[1]` · Research access → `access[1]` |
| `AZ-phoenix-womens-suffrage` | Warning → `access[1]`, `access[4]` · Go to → `access[1]`, `access[4]` · Phone → `access[1]` · Website → `sources[1]` · Closed → `access[1]` · Research access → `access[1]` · Check before you go → `access[1]`, `access[3]` |
| `AZ-poston-reflection` | Warning → `access[1]`, `access[2]` · Go to → `access[1]`, `access[2]` · Where you may stand → `access[4]` · Check before you go → `access[2]` |
| `AZ-prescott-women-preservation` | Go to → `locator.stableName` · Address → `locator.extra.Printed public museum locator` · Hours → `access[1]` · Admission → `access[2]` · Phone → `access[2]` · Website → `sources[1]` · Closed → `access[1]` · Research access → `access[3]` · Check before you go → `access[3]` |
| `AZ-salt-river-pima-maricopa-public-history` | Go to → `locator.stableName` · Address → `locator.address` · Hours → `access[1]`, `access[2]` · Admission → `access[1]` · Website → `sources[1]` · Closed → `access[1]` · Where you may stand → `access[3]` |
| `AZ-tohono-oodham-public-history` | Warning → `access[1]`, `access[2]` · Go to → `access[1]`, `access[4]` · Website → `sources[1]` |
| `AZ-tubac-print-workers` | Go to → `locator.extra.Public anchor` · Address → `locator.address` · Hours → `access[1]` · Admission → `access[1]` · Website → `sources[1]` · Closed → `access[1]` · Where you may stand → `access[2]` · Accessibility → `access[2]` |
| `AZ-tucson-barrio-preservation` | Warning → `access[1]`, `locator.extra.Public anchor` · Go to → `locator.extra.Public anchor` · Hours → `access[1]` · Website → `sources[9]` · Where you may stand → `access[1]` · Research access → `access[1]` |
| `AZ-tucson-chinese-grocers` | Go to → `locator.stableName` · Address → `locator.extra.Printed public institutional locator` · Hours → `access[1]` · Admission → `access[2]` · Phone → `access[1]` · Website → `sources[1]` · Where you may stand → `access[2]` |
| `AZ-tucson-civilian-aviation-workers` | Go to → `locator.extra.Public anchor` · Address → `locator.address` · Hours → `access[1]`, `access[2]` · Website → `sources[1]` · Closed → `access[1]` · Where you may stand → `access[1]`, `access[4]` · Accessibility → `access[2]`, `access[3]` · Check before you go → `access[1]` |
| `AZ-winslow-rail-hospitality` | Warning → `access[1]` · Go to → `locator.extra.Public anchor` · Hours → `access[1]` · Website → `sources[2]` · Closed → `access[1]` · Where you may stand → `access[1]` |
| `AZ-yuma-river-crossing-workers` | Go to → `locator.stableName` · Address → `locator.address` · Hours → `access[1]` · Website → `sources[1]` · Closed → `access[1]` · Where you may stand → `access[1]`, `access[3]` |
| `ID-bovill` | Go to → `locator.extra.Public anchor` |
| `ID-burke` | Warning → `access[1]` · Go to → `locator.extra.Public anchor` · Where you may stand → `locator.extra.Visitor boundary` |
| `ID-city-of-rocks-california-trail` | Go to → `locator.stableName` · Hours → `access[1]` · Phone → `access[1]` · Website → `sources[1]` · Closed → `access[1]` · Where you may stand → `access[1]` |
| `ID-craters-of-the-moon` | Warning → `access[1]` · Go to → `access[3]` · Website → `sources[1]` · Closed → `access[1]` · Where you may stand → `access[2]`, `access[3]` |
| `ID-idaho-city` | Go to → `locator.stableName`, `access[2]` · Hours → `access[1]` · Website → `sources[1]` · Where you may stand → `access[2]` · Check before you go → `access[1]` |
| `ID-nine-mile-cemetery` | Go to → `locator.extra.Public anchor` |
| `ID-pulaski-tunnel-trail` | Warning → `locator.extra.Visitor boundary` · Go to → `locator.extra.Public anchor` · Website → `sources[1]` · Where you may stand → `access[1]` |
| `ID-sunshine-miners-memorial` | Warning → `access[1]` · Go to → `locator.extra.Public anchor` · Where you may stand → `access[1]` · Parking → `access[1]` |
| `ID-three-island-crossing` | Go to → `locator.stableName` · Address → `access[1]` · Hours → `access[1]` · Admission → `access[1]` · Website → `sources[1]` · Closed → `access[1]` · Where you may stand → `access[2]` |
| `ID-wallace-brick-core` | Go to → `locator.extra.Public anchor` |
| `st-joe-st-maries` | Go to → `locator.extra.Public anchor` · Hours → `access[1]` · Closed → `access[1]` · Where you may stand → `access[1]` |
| `UT-saltair-amusement-workers` | Warning → `access[1]` · Go to → `access[1]`, `locator.extra.Public anchor` · Website → `sources[2]` · Where you may stand → `locator.extra.Visitor boundary` · Research access → `access[2]` |

## Desk review

Bisbee’s address comes from the printed public institutional locator, because the normalized address field is empty. The daily hours, admission tiers and phone come from the first access paragraph. The second access paragraph contains both closure lists. The museum’s site is the operator link in the first source. The table keeps the library’s separate research conditions and the museum-only boundary.

The production build passed, including all 701 static entry pages. All 15 repository tests passed. The full catalog rollout remains open. Desk review and merge are pending.
