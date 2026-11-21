# Photo assignment acceptance · November 21, 2026

Branch reviewed against the 701-entry catalog at `96c7d4b2e38696a651525b8a86fd28a9be372731`. The desk controls release through PR #3.

400 proposed assignments reconcile to 40 approved photographs on 39 distinct entries, 355 holds and 5 rejections. The build checked every slug and stable ID. Zero photo records had an orphan key. All five original Idaho entries retain photographs. 271 of the 299 checkpoint images were withheld in this batch. Holds include candidates awaiting individual verification. A hold does not establish that no free image exists.

The complete decision table and the photo-by-photo review sheet are desk deliverables. Every proposed assignment retains its source item and collision findings in [the machine-readable ledger](data/photo-desk/assignments.jsonl). The [field and desk work list](public/desk/photo-gaps.csv) contains exactly one row for each entry with no approved image.

| State | Entries | Baseline with photo | Branch with photo | Branch gaps |
|---|---:|---:|---:|---:|
| Arizona | 24 | 0 | 2 | 22 |
| Arkansas | 24 | 0 | 2 | 22 |
| California | 24 | 0 | 0 | 24 |
| Colorado | 24 | 0 | 1 | 23 |
| Idaho | 82 | 5 | 15 | 67 |
| Iowa | 24 | 0 | 2 | 22 |
| Kansas | 28 | 0 | 2 | 26 |
| Louisiana | 36 | 0 | 1 | 35 |
| Minnesota | 25 | 0 | 0 | 25 |
| Mississippi | 100 | 0 | 3 | 97 |
| Missouri | 24 | 0 | 1 | 23 |
| Montana | 24 | 0 | 0 | 24 |
| Nebraska | 20 | 0 | 0 | 20 |
| Nevada | 24 | 0 | 0 | 24 |
| New Mexico | 24 | 0 | 0 | 24 |
| North Dakota | 24 | 0 | 0 | 24 |
| Oklahoma | 24 | 0 | 0 | 24 |
| Oregon | 25 | 0 | 0 | 25 |
| South Dakota | 20 | 0 | 1 | 19 |
| Texas | 28 | 0 | 6 | 22 |
| Utah | 24 | 0 | 0 | 24 |
| Washington | 25 | 0 | 1 | 24 |
| Wyoming | 24 | 0 | 2 | 22 |

## Rendered checks

The production build completed with the existing map check enabled. Sixteen validation tests passed. Adding an unphotographed entry to an isolated copy of the catalog emitted gap-listed and produced the corresponding CSV row. All 701 rendered entry pages matched their catalog titles. Every photo figure matched its approved ledger row for slug, caption, printed credit and source link. All adopted images are inspected photographs from the named source records.

At 390 CSS pixels, the state listing card loaded its lead image. The ten entry pages below opened, decoded their photographs, matched their printed credits and captions, and fit horizontally. The sample was drawn from the sorted photographed slugs with seed 20261121.

| Entry and rendered route | Town and state | Era | Printed credit | Depicted subject |
|---|---|---|---|---|
| [Trail End staff: whose breakfast memory counts?](https://onoldground.com/sites/WY-sheridan-trail-end-staff) | Sheridan, Wyoming | now | IreneWyo | Kendrick Mansion at Trail End in Sheridan |
| [Craters of the Moon: a homeland, a photographed landscape, a public monument](https://onoldground.com/sites/ID-craters-of-the-moon) | Idaho | then | National Park Service staff, NPGallery | Craters of the Moon cinder landscape |
| [Troy Hospital — Dr. Meyers' house hospital on Main Street](https://onoldground.com/sites/ID-troy-hospital) | Troy, Idaho | now | Ian Poellet | Troy Hospital on South Main Street |
| [Fort Massachusetts and the men who guarded Ship Island](https://onoldground.com/sites/MS-fort-massachusetts-ship-island) | Ship Island, Mississippi | now | Reweaver33 | Brick casemates inside Fort Massachusetts on Ship Island |
| [Eldon — The window that made it into the painting](https://onoldground.com/sites/IA-eldon-american-gothic-house) | Eldon, Iowa | now | Eric Friedebach | American Gothic House in Eldon |
| [Watkins Woolen Mill — The workers between the belts](https://onoldground.com/sites/MO-watkins-woolen-mill-workers) | Missouri | now | CalendarGuy | Watkins Woolen Mill |
| [HT-RES-CO-amache-reflection — A school day inside confinement](https://onoldground.com/sites/CO-amache-reflection) | Granada, Colorado | then | Tom Parker (1907–1976) | Amache confinement camp near Granada |
| [Hot Springs — The people behind the baths](https://onoldground.com/sites/AR-hot-springs-bathhouse-workers) | Hot Springs, Arkansas | now | NPS | Fordyce Bathhouse porch, Hot Springs |
| [Port Isabel — Keeping a light through the weather](https://onoldground.com/sites/TX-port-isabel-lighthouse-maritime-work) | Port Isabel, Texas | now | Carol M. Highsmith | Port Isabel Lighthouse |
| [Bayhorse: the town that had to feed its furnace](https://onoldground.com/sites/bayhorse) | Bayhorse, Idaho | now | Sassygirljenna | Bayhorse mining townsite |

Heaviest measured entry including existing map sheets and rendered image fallback URLs: **Ste. Geneviève — Pélagie’s household on the census page**, 14,782,979 bytes. The largest assigned-photo total was **Grand Gulf and the difference between holding a fort and holding a river**, 342,510 bytes. The existing 1909 USGS Weingarten quadrangle alone measured 14,610,131 bytes. It accounts for most of the Ste. Genevieve total. Browser caches, viewport-selected card sizes and lazy loading affect actual transfers. Pages with an unmeasured image: 0.

Public production crawl: 822 sitemap URLs, 701 entry URLs, 54 distinct HTML image sources, 0 unresolved page requests and 0 unresolved image requests.

## Named collision checks

The manifest has no entry whose town is Baltimore. Wallace appears in both Idaho and Louisiana. The five candidate assignments whose target town is Wallace were all held. The Bisbee mine-train exhibit and Fort Totten photograph were rejected for their proposed entries.

## Next desk pass

Work the held assignments using the dossier and item links. Record the second independent key and resolve predecessor, relocation, shared-anchor and parent/child questions before approval. A new or unresolved entry stays on the gap list.
