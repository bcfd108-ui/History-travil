# On Old Ground machine-sources manifest

**Exported:** November 21, 2026, 4:43–4:46 AM PT (America/Los_Angeles)  
**Purpose:** Phase 1 Living Machine research-queue sources. Local plain-text copies of the lane lead sheets and desk sweep lists, for a generator to parse.  
**Drive access:** read-only. Nothing on Drive was edited, moved, or created.  
**Destination:** `/workspace/onoldground/machine-sources/`  
**Original filenames kept.** The lane state file has no extension on Drive; it is stored under that exact title, `THEME SWEEP — lane state`.

**Lane root on Drive:** shared drive folder **History Travel** (`1x4uM94uqjNxmwc3DXEHzZEJ1OLcpAAm6`), with lead-sheet files in **Indexes & Registers** (`16fWu2kfh04n1EkxXJzkBr2Y1u6RIbVDT`) and **Operations Blocks** (`1xp_buQ3tdR-wC5Tv2Sk9ZZeE8isg8-7z`). Desk HAVE/LEAD/NO-ANCHOR sweep lists and the LA–MS institutional supplement sit at the **shared-drive root** (`0ACKvlROfQTLaUk9PVA`), not inside History Travel. They are included because they are the desk sweep lists the brief named.

**Totals:** 32 files exported, **4,302,061 bytes** (4.10 MiB). Every local byte count matches the Drive `size` field. All 32 downloads succeeded.

**Current vs superseded:** a later `r2` (or absorbed supplement) is the current revision for that same artifact. County waves (GA Wave 1/2/3, FL Wave 1/2/3) are successive work, not replacements — all waves are current. Superseded files are still in this folder so a generator can diff them; they are marked below and should not be used as a primary queue source.

---

## Summary

| Class | Current files | Superseded files (exported, listed) |
|---|---|---|
| Finder lead sheets (AL, TN, KY, GA, FL, combined, Fort Campbell) | 11 | 4 (`AL` v1, `TN` v1, `KY` v1, and Fort Campbell absorbed into `TN` r2) |
| County-register control CSVs | 2 (`GA` r2, `FL` r2) | 2 (`GA` v1, `FL` v1) |
| Lane state file | 1 | 0 |
| Desk HAVE/LEAD/NO-ANCHOR sweep lists (10 territory lists + haunted) | 11 | 0 |
| Earlier ID / LA / MS supplements | 2 (`HT-SWEEP-ID-THEME-SWEEP.md`, `LA-MS-institutional-supplement.md`) | 0 |

`MS-first-sweep.md` and `LA-completion-sweep.md` are also the desk’s Mississippi and Louisiana HAVE/LEAD lists; they are counted in the sweep-list row above, not again as supplements.

---

## Files

Times below are America/Los_Angeles (UTC−8). Drive timestamps were in UTC. **Row count** is data rows in lead or register tables, excluding header and separator lines. Summary-only tables are noted separately.

### A. Finder lead sheets — current

| File | Drive file ID | Drive title (same) | Modified (PT) | Rows | Bytes | Lane | Current? | Drive folder |
|---|---|---|---|---:|---:|---|---|---|
| `LEAD-SHEET-AL-2026-11-21-r2.md` | `1SBUVhvbdTTzn-O0fflv3JkOvrDGaO_ST` | LEAD-SHEET-AL-2026-11-21-r2.md | Nov 21, 12:50:10 AM PT | 111 | 46,592 | Finder/Grok | **Yes** — supersedes `LEAD-SHEET-AL-2026-11-21.md` | Operations Blocks |
| `LEAD-SHEET-TN-2026-11-21-r2.md` | `1pN8J69UsOrhucbBEqP7wnIK-uUvpugoP` | LEAD-SHEET-TN-2026-11-21-r2.md | Nov 21, 2:34:15 AM PT | 52 (sheet status: 19 new + 33 HAVE) | 24,736 | Finder/Grok | **Yes** — titled “Revision 3”; supersedes `LEAD-SHEET-TN-2026-11-21.md`; also absorbs the two Fort Campbell leads | Indexes & Registers |
| `LEAD-SHEET-KY-2026-11-21-r2.md` | `1rVEHndk5QeHLuD1FXFwKYsVaQUfKTaGH` | LEAD-SHEET-KY-2026-11-21-r2.md | Nov 21, 2:11:50 AM PT | 87 | 43,584 | Finder/Grok | **Yes** — supersedes `LEAD-SHEET-KY-2026-11-21.md` | Operations Blocks |
| `LEAD-SHEET-AL-TN-KY-2026-11-21.md` | `15e6svzaHG3MvskLciA956IRtPXQrZrow` | LEAD-SHEET-AL-TN-KY-2026-11-21.md | Nov 21, 2:20:33 AM PT | 524 lead rows (sheet: 487 additions + 37 HAVE) + 1 summary table (3 rows) | 371,826 | Finder/Grok (Finder to Dash compilation) | **Yes** — later compiled block sheet with deeper Alabama county inventory. Overlaps AL/TN/KY r2; **dedupe required**, not a simple replacement of the r2 state sheets | Indexes & Registers |
| `LEAD-SHEET-GA-2026-11-21.md` | `1b-C8SbMJvGyKu1uoRath_KYesC5uZDy1` | LEAD-SHEET-GA-2026-11-21.md | Nov 21, 2:34:18 AM PT | 39 | 21,821 | Finder/Grok | **Yes** — Wave 1 (title also says “Waves 1–2”; Wave 2 lives in its own file) | Indexes & Registers |
| `LEAD-SHEET-GA-2026-11-21-Wave-2.md` | `1EOUIo9d761nLyUcnx9IgAuJZKZQ5z4oA` | LEAD-SHEET-GA-2026-11-21-Wave-2.md | Nov 21, 2:38:56 AM PT | 237 lead rows + 1 filing-summary row | 142,887 | Finder/Grok | **Yes** — Wave 2, additive | Operations Blocks |
| `LEAD-SHEET-GA-2026-11-21-Wave-3-Closeout.md` | `1lAGkira_IOPYqfSC2LQlTcTgQ8x6JM0I` | LEAD-SHEET-GA-2026-11-21-Wave-3-Closeout.md | Nov 21, 3:26:16 AM PT | 1,974 closeout rows + 6 register-reconciliation rows + 6 standard-format rows (1,986) | 1,054,617 | Finder/Grok | **Yes** — Georgia closeout, additive to Waves 1–2 | Indexes & Registers |
| `LEAD-SHEET-FL-2026-11-21.md` | `1z5Wz7ll4qIhi9XHP4378Z9OflqaXO_Cq` | LEAD-SHEET-FL-2026-11-21.md | Nov 21, 4:27:12 AM PT | 226 pipe rows across several table shapes (includes later Brevard/Hendry/Hernando continuations) | 151,408 | Finder/Grok | **Yes** — Wave 1 plus later continuation batches. Desk ruled the Brevard overlap: three continuation rows are XREF to Wave 2 | Indexes & Registers |
| `LEAD-SHEET-FL-2026-11-21-Wave-2.md` | `1KX0ARAWSo5xtqVwFB3ncqzkQYx_KqYIt` | LEAD-SHEET-FL-2026-11-21-Wave-2.md | Nov 21, 3:39:26 AM PT | 435 | 214,484 | Finder/Grok | **Yes** — Wave 2, additive; this file is the Brevard county-closure record | Operations Blocks |
| `LEAD-SHEET-FL-2026-11-21-Wave-3.md` | `1Fxdy4PkkhSF7BV7vxpZw4ZNRmPaM4lX6` | LEAD-SHEET-FL-2026-11-21-Wave-3.md | Nov 21, 4:31:00 AM PT | 191 + 41 with a Register-status column (232) | 110,469 | Finder/Grok | **Yes** — Wave 3, additive. Header notes Hendry/Hernando overlap with Wave 1 continuations | Operations Blocks |

### B. Finder lead sheets — superseded (exported, do not use as primary)

| File | Drive file ID | Drive title | Modified (PT) | Rows | Bytes | Lane | Why superseded | Drive folder |
|---|---|---|---|---:|---:|---|---|---|
| `LEAD-SHEET-AL-2026-11-21.md` | `1ZFvDIt3lsn0cu9PFBZF5bAEEXoobUDjU` | LEAD-SHEET-AL-2026-11-21.md | Nov 21, 12:37:25 AM PT | 86 | 35,732 | Finder/Grok | Superseded by `LEAD-SHEET-AL-2026-11-21-r2.md` | Operations Blocks |
| `LEAD-SHEET-TN-2026-11-21.md` | `12ec2J08qm9oHqFc-VomBjZBYcPKuf06_` | LEAD-SHEET-TN-2026-11-21.md | Nov 21, 12:38:01 AM PT | 31 | 14,994 | Finder/Grok | Superseded by `LEAD-SHEET-TN-2026-11-21-r2.md` | Operations Blocks |
| `LEAD-SHEET-KY-2026-11-21.md` | `1U49JcP4rhkA89RJV5G7SPrwqavJzbhP4` | LEAD-SHEET-KY-2026-11-21.md | Nov 21, 12:50:38 AM PT | 29 | 13,388 | Finder/Grok | Superseded by `LEAD-SHEET-KY-2026-11-21-r2.md` | Operations Blocks |
| `LEAD-SHEET-TN-2026-11-21-Fort-Campbell.md` | `1_wmdjmugTSIXb-bcRkGdrKIy0rbc2eqs` | LEAD-SHEET-TN-2026-11-21-Fort-Campbell.md | Nov 21, 2:32:49 AM PT | 2 | 3,223 | Finder/Grok | Additive supplement filed two minutes before TN r2. Both leads (Clarksville Base, Wings of Liberty Museum) are already in `LEAD-SHEET-TN-2026-11-21-r2.md`. Do not count as new leads | Operations Blocks |

### C. County-register control CSVs

| File | Drive file ID | Drive title | Modified (PT) | Rows | Bytes | Lane | Current? | Drive folder |
|---|---|---|---|---:|---:|---|---|---|
| `GA-2026-11-21-County-Register-Control-r2.csv` | `1SO82TJVp7OFXnkJJUQwmkcAFeJlL429d` | GA-2026-11-21-County-Register-Control-r2.csv | Nov 21, 3:14:59 AM PT | 2,256 | 583,902 | Finder/Grok | **Yes** — Georgia closeout control file | Operations Blocks |
| `GA-2026-11-21-County-Register-Control.csv` | `1KY--kn9rmFMDo9msXvjk7LOhhorG0UXY` | GA-2026-11-21-County-Register-Control.csv | Nov 21, 2:37:51 AM PT | 2,256 | 718,181 | Finder/Grok | **No** — same row count as r2, earlier and larger; superseded by r2 | Operations Blocks |
| `FL-2026-11-21-County-Register-Control-r2.csv` | `1iIpqKxbxT75mmUcCE-wJ176j0RU18xGd` | FL-2026-11-21-County-Register-Control-r2.csv | Nov 21, 4:31:06 AM PT | 1,929 | 180,679 | Finder/Grok | **Yes** — Wave 3 control file (33 of 67 counties closed) | Operations Blocks |
| `FL-2026-11-21-County-Register-Control.csv` | `1VsMdxR0DxCFHAJppOZ5hjLbU_p9vLyY0` | FL-2026-11-21-County-Register-Control.csv | Nov 21, 3:38:48 AM PT | 1,928 | 169,265 | Finder/Grok | **No** — superseded by r2 (r2 adds one row, Lafayette with no federal listings) | Operations Blocks |

### D. Lane state file

| File | Drive file ID | Drive title | Modified (PT) | Rows | Bytes | Lane | Current? | Drive folder |
|---|---|---|---|---:|---:|---|---|---|
| `THEME SWEEP — lane state` | `15IQ8XZV3JvhdDrdDJY7b8lMxKGHCerDT` | THEME SWEEP — lane state | Nov 21, 4:32:42 AM PT | Prose only (86 lines); no lead table | 18,717 | Finder/Grok | **Yes** — current Finder lane state, through Florida Wave 3 | Operations Blocks |

### E. Desk HAVE / LEAD / NO-ANCHOR sweep lists — current

These use Mark values `LEAD`, `NO-ANCHOR?`, `HAVE`, and (where used) `LISTED` or `OUT-OF-SCOPE-FOR-NOW`. All ten territory lists plus the haunted sweep were found. They live at the shared-drive root unless noted.

| File | Drive file ID | Drive title | Modified (PT) | Rows | Bytes | Lane | Current? | Drive folder |
|---|---|---|---|---:|---:|---|---|---|
| `AL-TN-KY-first-sweep.md` | `10btK8-_-sHk2WnhHNXyhgBQABW60Ij5v` | AL-TN-KY-first-sweep.md | Nov 20, 9:30:16 PM PT | 151 | 23,817 | Desk | Yes | Shared-drive root |
| `GA-FL-SC-NC-first-sweep.md` | `1KDOM1myXulzYefO-E2a20mbhp6U9NFZG` | GA-FL-SC-NC-first-sweep.md | Nov 20, 9:30:24 PM PT | 126 | 30,381 | Desk | Yes | Shared-drive root |
| `IL-IN-OH-first-sweep.md` | `1Jq00PWwx9aHsEgvnXtgDQPS4ZKjSNtOW` | IL-IN-OH-first-sweep.md | Nov 20, 9:30:43 PM PT | 179 | 30,923 | Desk | Yes | Shared-drive root |
| `MI-WI-first-sweep.md` | `1Czy83uxARbxcgWYk94UGn7g_ubMqDIeq` | MI-WI-first-sweep.md | Nov 20, 9:30:55 PM PT | 175 | 27,572 | Desk | Yes | Shared-drive root |
| `VA-WV-MD-DE-first-sweep.md` | `19ejWtoShxzGTqGC6gJfilMCyMHXtB-7w` | VA-WV-MD-DE-first-sweep.md | Nov 20, 9:31:23 PM PT | 168 | 31,418 | Desk | Yes | Shared-drive root |
| `PA-NY-NJ-first-sweep.md` | `161j42lgMORUffe-cAcVD_e-z2jJX7ny7` | PA-NY-NJ-first-sweep.md | Nov 20, 9:33:09 PM PT | 179 | 36,894 | Desk | Yes | Shared-drive root |
| `New-England-first-sweep.md` | `14cqc1bfw_xtNiVu5X_WUVLDDzV3FBTgY` | New-England-first-sweep.md | Nov 20, 9:31:56 PM PT | 213 | 37,520 | Desk | Yes | Shared-drive root |
| `AK-first-sweep.md` | `1dLOGkfrjnRSgHBxDjZwpU4idQ4pO2I_U` | AK-first-sweep.md | Nov 20, 9:30:47 PM PT | 119 (92 road-system + 27 out-of-scope) | 22,364 | Desk | Yes | Shared-drive root |
| `MS-first-sweep.md` | `1_yE3EVLtmbAuKlXgnr4pm00UbN1HHYu_` | MS-first-sweep.md | Nov 20, 9:03:33 PM PT | 104 | 13,345 | Desk | Yes | Shared-drive root |
| `LA-completion-sweep.md` | `1wmDXsWReFeIGHRSlcfEu4j-ed48cqlgm` | LA-completion-sweep.md | Nov 20, 9:03:32 PM PT | 111 | 15,080 | Desk | Yes | Shared-drive root |
| `haunted-leads-sweep.md` | `1fk66ImafhQVjPPwQruHJ4nbFa9hahtHc` | haunted-leads-sweep.md | Nov 20, 11:31:28 PM PT | 630 | 88,390 | Desk | Yes | Shared-drive root |

### F. Earlier ID / LA / MS supplements — current

No Drive files are titled `LEAD-SHEET-ID-*`, `LEAD-SHEET-LA-*`, or `LEAD-SHEET-MS-*`. The supplements exist under these names:

| File | Drive file ID | Drive title | Modified (PT) | Rows | Bytes | Lane | Current? | Drive folder |
|---|---|---|---|---:|---:|---|---|---|
| `LA-MS-institutional-supplement.md` | `1-75le2JvN4H1vNnFbA3WD_P-8Hb8Hx_v` | LA-MS-institutional-supplement.md | Nov 20, 11:17:30 PM PT | 26 | 10,174 | Desk | Yes — the 18 institutional readings are now HAVE in their state dossier folders, but the list itself is the source supplement | Shared-drive root |
| `HT-SWEEP-ID-THEME-SWEEP.md` | `1CHpHMTQTPlMGN4wFah6XYJjTAikgGxz3` | HT-SWEEP-ID-THEME-SWEEP.md | Nov 20, 9:39:51 PM PT | 37 | 13,678 | Fred (Theme Sweep; later desk intake note at top) | Yes — Idaho HAVE/LEAD/NO-ANCHOR theme list (prisons, hospitals, military, haunted, institutional) | Indexes & Registers |

---

## Table formats (for the queue generator)

Column headers are not uniform. A generator has to accept several dialects and must not assume the Finder 7-column sheet is universal.

### 1. Finder “canonical” 7-column sheet

Used by: `LEAD-SHEET-AL-2026-11-21.md` and `-r2.md`, `LEAD-SHEET-TN-2026-11-21.md` and `-r2.md`, `LEAD-SHEET-KY-2026-11-21.md` and `-r2.md`, `LEAD-SHEET-GA-2026-11-21.md`, and some blocks inside later FL/GA files.

```
Place | Town, County | Anchor | Family | Visitation tier & evidence signal | Source trail | Flags
```

**Wording variants of the same 7 columns** (treat as aliases, not new schemas):

| Variant | Files | Differences |
|---|---|---|
| `Anchor and status` + `Visitation tier and evidence signal` | `LEAD-SHEET-AL-TN-KY-2026-11-21.md`; some FL Wave 1 continuation tables | “and” instead of “&”; Anchor column titled “Anchor and status” |
| `Anchor + status` + `Visitation tier + signal` in **6 columns**, with place and town merged | `LEAD-SHEET-FL-2026-11-21-Wave-2.md` | Header is `Place / Town, County \| Anchor + status \| Family \| Visitation tier + signal \| Source trail \| Flags` |
| `Anchor + status` + `Tier + evidence signal` | `LEAD-SHEET-FL-2026-11-21-Wave-3.md` | Same 7 columns as canonical, shorter header names |
| Wave 3 state-register tables add an 8th column | `LEAD-SHEET-FL-2026-11-21-Wave-3.md` | `… \| Flags \| Register status` |

### 2. Finder “Lead and ground” compact tables (Georgia Waves 2–3, some Florida Wave 1)

| Header | Files | Notes |
|---|---|---|
| `Lead and ground \| Tier and signal \| Public anchor and boundary \| Free evidence` | GA Wave 2 (237 rows) | 4 columns; no separate Town/Family/Flags columns — family and flags are usually inside the cells |
| `Lead and ground \| Family \| Tier and signal \| Public anchor and boundary \| Free evidence` | GA Wave 3 closeout (1,974 rows) | Wave 3 adds a **Family** column to the Wave 2 shape |
| `Lead and ground \| Family \| Tier & signal \| Public anchor & boundary \| Free evidence \| Flags` | FL Wave 1 (statewide courthouse/jail blocks) | 6 columns; “&” vs “and” |
| `Place \| County \| Family \| Tier & signal \| Public anchor & boundary \| Free evidence \| Flags` | FL Wave 1 (one block) | Town dropped; County only |
| `Place \| Town, County \| Family \| Tier & signal \| Public anchor & conflict status \| Free evidence` | GA closeout register-reconciliation block (6 rows) | “conflict status” in the anchor column; no Flags |

### 3. One-off Finder tables

| Header | File | Rows | Role |
|---|---|---|---|
| `Lead \| Public anchor \| Tier and signal \| Evidence and disposition` | `LEAD-SHEET-TN-2026-11-21-Fort-Campbell.md` | 2 | Supplement; absorbed into TN r2 |
| `Ground \| Location \| 2025 NPS IRMA / Signal \| Lawful Public Access & Named Operator / Closure Status (\`2026-11-21\`) \| Free Evidence` | FL Wave 1 | 6 | Access/closure checklist, not the standard lead row |
| `Existing lead \| Evidence for the Stringer and access ruling` | FL Wave 1 | 7 | Cross-reference notes |
| `Filing \| New \| Live HAVE this wave \| Verified open \| Exterior only \| Seasonal \| NONE \| Tier 1 \| Tier 2 \| Tier 3 \| Tier 4` | GA Wave 2 | 1 | Wave totals, not leads |
| `County \| New leads \| HAVE \| New anchored \| New NONE \| New tiers 1 / 2 / 3 / 4` | AL–TN–KY combined | 3 | County summary |
| `County \| Distinct additions \| HAVE cross-references \| Anchored / NONE, additions only \| Tier 1 / 2 / 3 / 4, additions only` | FL Wave 1 | 4 | County summary |
| `County \| New \| HAVE \| Anchored / NONE, new only \| Tier 1 / 2 / 3 / 4, new only` | FL Wave 1 | 3 | County summary |

### 4. Desk sweep lists (HAVE / LEAD / NO-ANCHOR)

Shared 4-column shape, with the fourth-column title varying:

```
Candidate | Location | Mark | <fourth>
```

| Fourth-column title | Files |
|---|---|
| `Likely anchor / note` | All ten territory first/completion sweeps (most tables) |
| `Note` | `AK-first-sweep.md` out-of-scope (fly-in / bush / marine-highway) table only |
| `Ground / anchor / source` | `haunted-leads-sweep.md` |
| `Reason & lead source` | `HT-SWEEP-ID-THEME-SWEEP.md` |

`LA-MS-institutional-supplement.md` uses the territory-sweep header (`Likely anchor / note`). Mark vocabulary: `LEAD`, `NO-ANCHOR` or `NO-ANCHOR?`, `HAVE`, plus `LISTED` (haunted sweep) and `OUT-OF-SCOPE-FOR-NOW` (Alaska). Idaho theme sweep writes `NO-ANCHOR` without the question mark.

### 5. County-register control CSVs — two different 11-column schemas

**Florida** (lowercase, Finder disposition already baked in):

```
county, ref, property, city, disposition_bucket, anchor, tier, family, flags, county_status, wave
```

**Georgia** (title case, register-control oriented — not the same fields):

```
County, Reference as printed, Property / record name, Record type, Source, Georgia Register evidence, Finder disposition, Linked lead ID or next action, Additional source, Live collision, Checked UTC
```

Do not parse GA rows with the FL header, or the reverse. r2 is the current file in both states.

### 6. Lane state file

`THEME SWEEP — lane state` is Markdown prose (Finder state blocks, file IDs, coverage math). No lead table. Useful as a run log and as a pointer to canonical file IDs, not as a row source.

---

## Generator cautions

- **Dedupe across files, not within one file.** Known overlaps: AL/TN/KY r2 sheets vs `LEAD-SHEET-AL-TN-KY-2026-11-21.md`; Fort Campbell supplement vs TN r2; FL Wave 1 continuations vs Wave 2 (Brevard: Kennedy Space Center / Sands / Lighthouse are XREF) and vs Wave 3 (Hendry, Hernando); desk first-sweeps vs later Finder sheets vs the haunted sweep (`LISTED` rows already point at another list).
- **Waves are additive.** Closing Georgia or a Florida county in a later wave does not retire the earlier wave file.
- **Anchor wording varies:** `verified open`, `exterior only`, `seasonal`, `NONE`, plus desk marks `LEAD` / `NO-ANCHOR?` / `HAVE`. Normalize before ranking.
- **Tier column** may be `Visitation tier & evidence signal`, `Tier + evidence signal`, `Tier and signal`, or `Tier & signal`, and often includes `NO SIGNAL` in the same cell.

---

## Not found / not exported

- **No files titled `LEAD-SHEET-ID-*`, `LEAD-SHEET-LA-*`, or `LEAD-SHEET-MS-*`.** Idaho, Louisiana, and Mississippi leads are in the desk sweep lists and the two supplement files in section F, plus `MS-first-sweep.md` and `LA-completion-sweep.md`.
- **`theme-row confirmation`**, cited in `haunted-leads-sweep.md` as a collision-check source, was not found under that title (or “theme row” / “theme confirmation”) in Drive. It was not exported.
- **Fred operation packets** (`HT-OPS-*`, `HT-SWEEP-LA-*`, `HT-SWEEP-AR-*`, `HT-ID-Cottonwood-Backward-Sweep.md`, state blocks, dossiers) were not exported. Those are dossier/ops filings, not lead sheets or desk HAVE/LEAD lists. The one exception is `HT-SWEEP-ID-THEME-SWEEP.md`, which is an Idaho lead list.
- **`HT-US-INDEX.csv`** and map-library files in Indexes & Registers were not exported; they are not lead sheets or sweep lists.
- **QC & Field** under History Travel was empty.

Nothing that the brief named failed to download once it was located. The only named source that could not be exported is the missing `theme-row confirmation` file.
