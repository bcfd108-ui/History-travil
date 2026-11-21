// Phase 1 research / photo / verification queues.
// Regenerated from frozen desk sources. No network. No clock. Stable sort.
//
// Work order (research items):
//   1. Seeding — the item's state has zero live catalog entries.
//      Within seeding: tier 1, then 2, then 3, then 4, then unknown.
//      Within a tier: march order, then lead id.
//   2. Depth — the item's state has at least one live catalog entry.
//      March order, then tier, then lead id.
//   March blocks, in order, states in the order written:
//     AL TN KY | GA FL SC NC | IL IN OH | MI WI | VA WV MD DE |
//     PA NY NJ | ME VT NH MA CT RI (New England, the sweep file's own order) | AK
//   A state that is not in that list sorts after Alaska, by postal code.
//   "Most-visited first" in the brief is the tier number. The sheets do not
//   carry a second visitation rank, so tier is the only seeding rank.
//
// Lead id:
//   lq_ + first 16 hex chars of SHA-256 over
//   norm(state)|norm(town)|norm(county)|norm(name)|canonicalFile
//   canonicalFile is the creator source (role lead, dead, or held) with the
//   lexicographically smallest file name, then the smallest line number.
//   norm() lowercases, turns & into "and", and collapses punctuation to spaces.
//   HAVE / XREF / LISTED rows never choose the canonical file.
//
// Dedupe (across sheets, not by deleting sources):
//   Creator rows union when they share a state and a register id, or a state
//   and a normalized name with compatible town and county. A filled town does
//   not merge with a different filled town. A row with no town and no county
//   joins a same-name group only when exactly one such group exists; otherwise
//   those bare rows stay together as their own item.
//   HAVE, XREF, and LISTED rows never create an item. When exactly one item
//   matches, they are kept on that item as extra source references.
//   Checked-dead wins over queued and held when any creator source says the
//   lead was checked dead. Held is used only when every creator source is held.
//
// Reconciliation (after dedupe):
//   A live catalog match (sites.json) sets queueState to published.
//   A corpus dossier that is absent from sites.json sets queueState to filed.
//   Match: same postal state, and normalized name equals the catalog title,
//   the locator stable name, or the slug as words; or the lead name is a
//   whole-word phrase of at least 12 characters inside one of those.
//   Towns must be equal when both sides have a town. Several matches leave
//   the item unreconciled (targetSlug null, reconcile "ambiguous").
//
// Verification dates:
//   The first "Checked <date>" in the dossier wins (preamble or trip gate).
//   Accepted shapes: YYYY-MM-DD, "November 19, 2026", "19 November 2026",
//   "Nov. 20, 2026". No such line -> verifiedOn null ("unrecorded"), and
//   nulls sort first (never verified is the oldest), then the date, then slug.
//
// Photo queue:
//   JSON twin of photo-gaps.csv (same row order, same header keys) when that
//   file is on disk at app/public/desk/photo-gaps.csv or app/data/photo-gaps.csv.
//   The generator of that CSV is not on main (open PR #3 only) and is not
//   copied here. With no CSV, status is "pending: gap report not on main".
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export const MARCH = [
  ["AL", "TN", "KY"],
  ["GA", "FL", "SC", "NC"],
  ["IL", "IN", "OH"],
  ["MI", "WI"],
  ["VA", "WV", "MD", "DE"],
  ["PA", "NY", "NJ"],
  ["ME", "VT", "NH", "MA", "CT", "RI"],
  ["AK"],
];

const STATE_NAMES = [
  ["west virginia", "WV"],
  ["north carolina", "NC"],
  ["south carolina", "SC"],
  ["north dakota", "ND"],
  ["south dakota", "SD"],
  ["new hampshire", "NH"],
  ["new jersey", "NJ"],
  ["new mexico", "NM"],
  ["new york", "NY"],
  ["rhode island", "RI"],
  ["massachusetts", "MA"],
  ["connecticut", "CT"],
  ["pennsylvania", "PA"],
  ["mississippi", "MS"],
  ["washington", "WA"],
  ["california", "CA"],
  ["tennessee", "TN"],
  ["wisconsin", "WI"],
  ["louisiana", "LA"],
  ["minnesota", "MN"],
  ["michigan", "MI"],
  ["kentucky", "KY"],
  ["colorado", "CO"],
  ["maryland", "MD"],
  ["missouri", "MO"],
  ["nebraska", "NE"],
  ["oklahoma", "OK"],
  ["virginia", "VA"],
  ["arkansas", "AR"],
  ["delaware", "DE"],
  ["illinois", "IL"],
  ["indiana", "IN"],
  ["montana", "MT"],
  ["alabama", "AL"],
  ["alaska", "AK"],
  ["arizona", "AZ"],
  ["florida", "FL"],
  ["georgia", "GA"],
  ["hawaii", "HI"],
  ["kansas", "KS"],
  ["nevada", "NV"],
  ["oregon", "OR"],
  ["vermont", "VT"],
  ["wyoming", "WY"],
  ["idaho", "ID"],
  ["iowa", "IA"],
  ["maine", "ME"],
  ["ohio", "OH"],
  ["texas", "TX"],
  ["utah", "UT"],
];

const NAME_TO_CODE = new Map(STATE_NAMES);

export const CURRENT_SOURCE_FILES = [
  "LEAD-SHEET-AL-2026-11-21-r2.md",
  "LEAD-SHEET-TN-2026-11-21-r2.md",
  "LEAD-SHEET-KY-2026-11-21-r2.md",
  "LEAD-SHEET-AL-TN-KY-2026-11-21.md",
  "LEAD-SHEET-GA-2026-11-21.md",
  "LEAD-SHEET-GA-2026-11-21-Wave-2.md",
  "LEAD-SHEET-GA-2026-11-21-Wave-3-Closeout.md",
  "LEAD-SHEET-FL-2026-11-21.md",
  "LEAD-SHEET-FL-2026-11-21-Wave-2.md",
  "LEAD-SHEET-FL-2026-11-21-Wave-3.md",
  "GA-2026-11-21-County-Register-Control-r2.csv",
  "FL-2026-11-21-County-Register-Control-r2.csv",
  "THEME SWEEP — lane state",
  "AL-TN-KY-first-sweep.md",
  "GA-FL-SC-NC-first-sweep.md",
  "IL-IN-OH-first-sweep.md",
  "MI-WI-first-sweep.md",
  "VA-WV-MD-DE-first-sweep.md",
  "PA-NY-NJ-first-sweep.md",
  "New-England-first-sweep.md",
  "AK-first-sweep.md",
  "MS-first-sweep.md",
  "LA-completion-sweep.md",
  "haunted-leads-sweep.md",
  "LA-MS-institutional-supplement.md",
  "HT-SWEEP-ID-THEME-SWEEP.md",
];

// Exported in the Drive manifest and left out of this snapshot on purpose.
export const SUPERSEDED_SOURCE_FILES = [
  "LEAD-SHEET-AL-2026-11-21.md",
  "LEAD-SHEET-TN-2026-11-21.md",
  "LEAD-SHEET-KY-2026-11-21.md",
  "LEAD-SHEET-TN-2026-11-21-Fort-Campbell.md",
  "GA-2026-11-21-County-Register-Control.csv",
  "FL-2026-11-21-County-Register-Control.csv",
];

const QUEUE_STATES = new Set(["queued", "working", "filed", "published", "checked-dead", "held"]);
const CREATOR_ROLES = new Set(["lead", "dead", "held"]);
const ATTACH_ROLES = new Set(["have", "xref", "listed"]);
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

export function normName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normId(value) {
  const digits = String(value || "").replace(/\D/g, "").replace(/^0+/, "");
  return digits;
}

export function leadId(item, canonicalFile) {
  const payload = [
    normName(item.state),
    normName(item.town),
    normName(item.county),
    normName(item.name),
    canonicalFile,
  ].join("|");
  return "lq_" + createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function projectSlug(state, name) {
  const body = normName(name).replace(/\s+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  return `${String(state || "").toLowerCase()}-${body}`;
}

export function stableStringify(value) {
  return JSON.stringify(value, null, 1) + "\n";
}

function cleanCell(value) {
  return String(value || "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normHeader(value) {
  return cleanCell(value).toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim();
}

function defaultStateForFile(filename) {
  const base = filename.split("/").pop();
  if (/^LEAD-SHEET-AL-TN-KY/.test(base)) return "";
  if (/^LEAD-SHEET-AL-/.test(base)) return "AL";
  if (/^LEAD-SHEET-TN-/.test(base)) return "TN";
  if (/^LEAD-SHEET-KY-/.test(base)) return "KY";
  if (/^LEAD-SHEET-GA-/.test(base)) return "GA";
  if (/^LEAD-SHEET-FL-/.test(base)) return "FL";
  if (base.startsWith("MS-")) return "MS";
  if (base.startsWith("LA-completion")) return "LA";
  if (base.startsWith("AK-")) return "AK";
  if (base.startsWith("HT-SWEEP-ID")) return "ID";
  if (base.startsWith("GA-") && base.endsWith(".csv")) return "GA";
  if (base.startsWith("FL-") && base.endsWith(".csv")) return "FL";
  return "";
}

function stateFromHeading(line) {
  // County ledger headings are h3 ("### Washington (18 federal…)"). A Georgia
  // county named Washington must not become the state of Washington. State
  // sections in these sheets are h1 or h2.
  const level = (line.match(/^(#+)/) || [])[1]?.length || 0;
  if (level < 1 || level > 2) return "";
  let text = line.replace(/^#+\s*/, "").replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();
  if (lower.includes("·") || lower.includes(" / ")) {
    const tail = lower.match(/,\s*([a-z ]+)$/);
    if (tail && NAME_TO_CODE.has(tail[1].trim())) return NAME_TO_CODE.get(tail[1].trim());
    return "";
  }
  const tail = lower.match(/,\s*([a-z ]+)$/);
  if (tail && NAME_TO_CODE.has(tail[1].trim())) return NAME_TO_CODE.get(tail[1].trim());
  const head = lower.split(/\s+[—–:-]\s+/)[0].trim();
  return NAME_TO_CODE.get(head) || "";
}

function countyFromHeading(line) {
  if (!/^#{2,}\s/.test(line)) return undefined;
  const raw = line.replace(/^#+\s*/, "").trim();
  if (!raw || raw.length > 90) return undefined;
  const withWord = raw.match(/^([A-Z][A-Za-z.'’/-]*(?:\s+[A-Z][A-Za-z.'’/-]*){0,3})\s+County\b/);
  if (withWord) return withWord[1].replace(/\s+/g, " ");
  const counted = raw.match(/^([A-Z][A-Za-z.'’/-]*(?:\s+[A-Z][A-Za-z.'’/-]*){0,2})\s+\(\d+\b/);
  if (counted) return counted[1].replace(/\s+/g, " ");
  // Bare county names are h3 ledger headings ("### Appling"), never h2 state names ("## Maine").
  if (!line.startsWith("###")) return undefined;
  const bare = raw.match(/^([A-Z][A-Za-z.'’/-]+(?:\s+[A-Z][A-Za-z.'’/-]+){0,2})$/);
  if (!bare) return undefined;
  if (NAME_TO_CODE.has(bare[1].toLowerCase())) return undefined;
  const first = bare[1].split(" ")[0];
  if (/^(Part|Wave|Note|Notes|Desk|Step|Coverage|Reading|Sequencing|Independent|Federal|State|Status|Summary|Family|How|The|All|New|Old|Intake|Collision|Notable)$/.test(first)) {
    return undefined;
  }
  return bare[1];
}

function stripCounty(value) {
  return cleanCell(value)
    .replace(/\bcount(y|ies)\b/gi, "")
    .replace(/\bparish(es)?\b/gi, "")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function parseLocality(value) {
  const text = cleanCell(value).replace(/\bCo\./g, "County");
  if (!text) return { town: "", county: "" };
  const bits = text.split(",").map((part) => part.trim()).filter(Boolean);
  if (bits.length >= 2) return { town: bits[0], county: stripCounty(bits.slice(1).join(", ")) };
  if (/\b(county|counties|parish|parishes)\b/i.test(text)) return { town: "", county: stripCounty(text) };
  return { town: text, county: "" };
}

function extractRegisterId(value) {
  const match = String(value || "").match(/\b(?:ID|NRHP|NRIS|NR)\s*#?\s*0*(\d{4,10})\b/i);
  return match ? match[1].replace(/^0+/, "") : "";
}

function parseTier(value) {
  const text = cleanCell(value);
  if (!text) return null;
  const labeled = text.match(/tier\s*([1-4])\b/i);
  if (labeled) return Number(labeled[1]);
  const leading = text.match(/^([1-4])\b/);
  if (leading) return Number(leading[1]);
  return null;
}

function parsePlace(cell) {
  const clean = cleanCell(cell);
  const parts = clean.split(/\s+·\s+/);
  const markedHave = /^HAVE\b/i.test(parts[0]);
  let name = parts[0].replace(/^HAVE\s*[—–-]+\s*/i, "").replace(/,?\s*\bNR(?:IS|HP)?\s+\d+\b.*$/i, "").trim();
  let town = "";
  let county = "";
  const second = parts[1] || "";
  if (second && !/^(?:ID|NR|NRIS|NRHP)\b/i.test(second)) {
    const loc = parseLocality(second);
    town = loc.town;
    county = loc.county;
  }
  return { name, town, county, registerId: extractRegisterId(clean), raw: clean, markedHave };
}

export function detectDialect(headers) {
  const raw = headers.map((header) => cleanCell(header));
  const h = raw.map(normHeader);
  const joined = h.join(" | ");
  const tierRaw = raw.find((header) => /tier/i.test(header)) || "";
  if (h[0] === "filing" || (h[0] === "county" && (joined.includes("new leads") || joined.includes("distinct additions") || joined.includes("new | have") || joined.includes("new anchored")))) {
    return "finder-summary";
  }
  if (h[0] === "existing lead") return "finder-existing-lead-2";
  if (h[0] === "ground" && h[1] === "location") return "finder-access-audit-5";
  if (h[0] === "lead" && h.includes("evidence and disposition")) return "finder-fort-campbell-4";
  if (h[0] === "candidate" && h[1] === "location" && h[2] === "mark") return "desk-sweep-4";
  if (h.includes("register status")) return "finder-fl-wave3-8";
  if (h[0] === "place / town, county") return "finder-fl-wave2-6";
  if (h.includes("public anchor and conflict status")) return "finder-register-reconciliation-6";
  if (h[0] === "lead and ground" && h[1] === "tier and signal") return "finder-lead-ground-4";
  if (h[0] === "lead and ground" && h[1] === "family" && !h.includes("flags")) return "finder-lead-ground-5";
  if (h[0] === "lead and ground" && h.includes("flags")) return "finder-lead-ground-6";
  if (h[0] === "place" && h[1] === "county" && h[2] === "family") return "finder-place-county-7";
  if (h.includes("anchor and status") || /visitation tier and evidence signal/i.test(tierRaw)) return "finder-anchor-and-status-7";
  if (h.includes("anchor + status") && h.includes("tier + evidence signal")) return "finder-fl-wave3-7";
  if (h[0] === "place" && /visitation tier\s*&\s*evidence signal/i.test(tierRaw)) return "finder-canonical-7";
  if (h[0] === "county" && h.includes("disposition_bucket")) return "csv-fl-register-11";
  if (h.includes("finder disposition") && h.includes("property / record name")) return "csv-ga-register-11";
  return "unrecognized";
}

function headerRoles(headers) {
  const roles = {};
  headers.forEach((header, index) => {
    const name = normHeader(header);
    let role = "";
    if (name === "place / town, county" || name === "place" || name === "lead and ground" || name === "lead" || name === "candidate" || name === "ground" || name === "existing lead" || name === "property" || name === "property / record name") role = "place";
    else if (name === "town, county" || name === "location") role = "townCounty";
    else if (name === "city") role = "town";
    else if (name === "county") role = "county";
    else if (name === "anchor" || name === "anchor and status" || name === "anchor + status" || name.startsWith("public anchor") || name.startsWith("likely anchor") || name.startsWith("ground / anchor") || name.startsWith("reason") || name === "note" || name.startsWith("lawful public access")) role = "anchor";
    else if (name.includes("tier") || name.startsWith("2025 nps")) role = "tier";
    else if (name === "flags" || name === "evidence and disposition") role = "flags";
    else if (name === "mark") role = "mark";
    else if (name === "register status") role = "registerStatus";
    else if (name === "disposition_bucket" || name === "finder disposition") role = "disposition";
    else if (name === "ref" || name === "reference as printed") role = "ref";
    if (role && roles[role] == null) roles[role] = index;
  });
  return roles;
}

function cell(row, roles, role) {
  const index = roles[role];
  if (index == null || index >= row.length) return "";
  return row[index];
}

function classifyRow(draft, dialect) {
  if (dialect === "finder-summary" || dialect === "unrecognized") return dialect === "finder-summary" ? "summary" : "skip";
  if (dialect === "finder-existing-lead-2") return "xref";
  const mark = cleanCell(draft.mark).replace(/[⚑★]/g, "").trim();
  const flags = cleanCell(draft.flags);
  const anchor = cleanCell(draft.anchor);
  const disposition = cleanCell(draft.disposition);
  const registerStatus = cleanCell(draft.registerStatus);
  const name = cleanCell(draft.name);
  const blob = `${flags} | ${mark} | ${anchor} | ${disposition} | ${registerStatus}`;
  if (/^(HAVE|HAVE-LEAD)$/i.test(mark)) return "have";
  if (/^LISTED$/i.test(mark)) return "listed";
  if (draft.markedHave || /^HAVE\b/i.test(name) || /^HAVE\b/i.test(flags) || /(^|[·,])\s*HAVE\b/i.test(flags)) return "have";
  if (/federal removal/i.test(disposition) && /no new lead/i.test(disposition)) return "skip";
  if (/no federal rows/i.test(disposition)) return "skip";
  if (/\bXREF\b/i.test(blob) || /^see wave/i.test(disposition) || /previously filed/i.test(disposition)) return "xref";
  if (/\bDEAD\b/i.test(blob) || /checked dead/i.test(blob)) return "dead";
  if (/OUT-OF-SCOPE/i.test(mark) || /OUT-OF-SCOPE/i.test(flags) || /OUT-OF-SCOPE/i.test(disposition)) return "held";
  return "lead";
}

function rowsFromTable(file, headers, dataRows, startLine, state, county) {
  const dialect = detectDialect(headers);
  const roles = headerRoles(headers);
  return dataRows.map((data, offset) => {
    const place = parsePlace(cell(data, roles, "place"));
    const locality = parseLocality(cell(data, roles, "townCounty"));
    const explicitTown = cleanCell(cell(data, roles, "town"));
    const explicitCounty = stripCounty(cell(data, roles, "county"));
    const town = locality.town || explicitTown || place.town;
    const rowCounty = locality.county || explicitCounty || place.county || county || "";
    const ref = cleanCell(cell(data, roles, "ref"));
    const registerId = normId(ref) || place.registerId;
    const anchor = cleanCell(cell(data, roles, "anchor"));
    const disposition = cleanCell(cell(data, roles, "disposition"));
    const mark = cleanCell(cell(data, roles, "mark"));
    const draft = {
      name: place.name,
      markedHave: place.markedHave,
      flags: cell(data, roles, "flags"),
      mark,
      anchor,
      disposition,
      registerStatus: cell(data, roles, "registerStatus"),
    };
    const role = classifyRow(draft, dialect);
    const anchorPosture = anchor || disposition || mark.replace(/[⚑★]/g, "").trim();
    return {
      file,
      row: startLine + offset,
      dialect,
      role,
      name: place.name,
      town,
      county: rowCounty,
      state,
      tier: parseTier(cell(data, roles, "tier")),
      anchorPosture,
      registerId: registerId || "",
    };
  });
}

export function parseMarkdown(file, text) {
  const lines = text.split(/\r?\n/);
  let state = defaultStateForFile(file);
  let county = "";
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingState = stateFromHeading(line);
    if (headingState) {
      state = headingState;
      const named = countyFromHeading(line);
      county = named || "";
    } else {
      const named = countyFromHeading(line);
      if (named) county = named;
    }
    if (!line.trim().startsWith("|") || i + 1 >= lines.length || !/^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) continue;
    if (!lines[i + 1].includes("-")) continue;
    const headers = splitPipe(line);
    let cursor = i + 2;
    const data = [];
    while (cursor < lines.length && lines[cursor].trim().startsWith("|")) {
      data.push(splitPipe(lines[cursor]));
      cursor++;
    }
    rows.push(...rowsFromTable(file, headers, data, i + 3, state, county));
    i = cursor - 1;
  }
  return rows;
}

function splitPipe(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((part) => part.trim());
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  const lineAt = [];
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      lineAt.push(line);
      rows.push(row);
      row = [];
      cell = "";
      line++;
    } else if (char !== "\r") cell += char;
  }
  if (cell.length || row.length) {
    row.push(cell);
    lineAt.push(line);
    rows.push(row);
  }
  return { rows, lineAt };
}

export function parseCsvSource(file, text) {
  const { rows, lineAt } = parseCsv(text);
  if (!rows.length) return [];
  const headers = rows[0];
  const dialect = detectDialect(headers);
  const state = defaultStateForFile(file);
  return rows.slice(1).filter((data) => data.some((value) => cleanCell(value))).map((data, index) => {
    const built = rowsFromTable(file, headers, [data], lineAt[index + 1], state, "")[0];
    built.dialect = dialect;
    if (!built.county) built.county = stripCounty(built.county);
    return built;
  });
}

export function parseSourceText(file, text) {
  if (file.endsWith(".csv")) return parseCsvSource(file, text);
  return parseMarkdown(file, text);
}

function sourceOf(row) {
  return { file: row.file, row: row.row, dialect: row.dialect, role: row.role };
}

function townsConflict(a, b) {
  const left = normName(a.town);
  const right = normName(b.town);
  return Boolean(left && right && left !== right);
}

function countiesConflict(a, b) {
  const left = normName(a.county);
  const right = normName(b.county);
  return Boolean(left && right && left !== right);
}

function localityCompatible(a, b) {
  return !townsConflict(a, b) && !countiesConflict(a, b);
}

function byFileRow(a, b) {
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  return a.row - b.row;
}

function representative(members) {
  const creators = members.filter((row) => CREATOR_ROLES.has(row.role));
  return [...creators].sort(byFileRow)[0];
}

function marchKey(state) {
  for (let block = 0; block < MARCH.length; block++) {
    const index = MARCH[block].indexOf(state);
    if (index >= 0) return [block, index, state];
  }
  return [MARCH.length, 0, state];
}

function tierRank(tier) {
  return tier == null ? 99 : tier;
}

export function compareResearch(a, b, liveStates) {
  const aSeed = !liveStates.has(a.state);
  const bSeed = !liveStates.has(b.state);
  if (aSeed !== bSeed) return aSeed ? -1 : 1;
  if (aSeed) {
    const tier = tierRank(a.tier) - tierRank(b.tier);
    if (tier) return tier;
  }
  const [aBlock, aIndex, aState] = marchKey(a.state);
  const [bBlock, bIndex, bState] = marchKey(b.state);
  if (aBlock !== bBlock) return aBlock - bBlock;
  if (aBlock < MARCH.length && aIndex !== bIndex) return aIndex - bIndex;
  if (aState !== bState) return aState < bState ? -1 : 1;
  if (!aSeed) {
    const tier = tierRank(a.tier) - tierRank(b.tier);
    if (tier) return tier;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function nameMatch(lead, entry) {
  // Exact normalized name only. A shorter lead does not claim a longer
  // dossier title ("Mammoth Cave" is not "Mammoth Cave National Park").
  const name = normName(lead.name);
  if (!name) return false;
  const candidates = [normName(entry.title), normName(entry.stableName), normName(String(entry.slug || "").replace(/-/g, " "))].filter(Boolean);
  return candidates.includes(name);
}

function townCompatible(leadTown, entryTown) {
  const lead = normName(leadTown);
  const entry = normName(entryTown);
  if (!lead || !entry) return true;
  return lead === entry;
}

export function matchCatalog(item, entries) {
  const hits = entries.filter((entry) => entry.state === item.state && nameMatch(item, entry) && townCompatible(item.town, entry.town));
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) {
    const exact = hits.filter((entry) => normName(entry.town) && normName(entry.town) === normName(item.town));
    if (exact.length === 1) return exact[0];
    return { ambiguous: true, slugs: hits.map((hit) => hit.slug).sort() };
  }
  return null;
}

export function assembleResearchQueue(rows, { liveEntries = [], corpusOnlyEntries = [] } = {}) {
  const creators = [];
  const attachers = [];
  const unrecognized = new Map();
  for (const row of rows) {
    if (!row || row.role === "summary") continue;
    if (row.dialect === "unrecognized" || row.role === "skip") {
      if (row.dialect === "unrecognized") {
        const key = row.dialect + " " + (row.signature || "");
        unrecognized.set(row.file + ":" + row.dialect, (unrecognized.get(row.file + ":" + row.dialect) || 0) + 1);
      }
      continue;
    }
    if (!normName(row.name) || !row.state) continue;
    if (ATTACH_ROLES.has(row.role)) attachers.push(row);
    else if (CREATOR_ROLES.has(row.role)) creators.push(row);
  }

  const parent = creators.map((_, index) => index);
  const find = (index) => {
    let cursor = index;
    while (parent[cursor] !== cursor) {
      parent[cursor] = parent[parent[cursor]];
      cursor = parent[cursor];
    }
    return cursor;
  };
  const union = (a, b) => {
    const left = find(a);
    const right = find(b);
    if (left !== right) parent[right] = left;
  };

  const byId = new Map();
  creators.forEach((row, index) => {
    if (!row.registerId) return;
    const key = `${row.state}|${row.registerId}`;
    if (byId.has(key)) union(index, byId.get(key));
    else byId.set(key, index);
  });

  const byTown = new Map();
  creators.forEach((row, index) => {
    if (!normName(row.town)) return;
    const key = `${row.state}|${normName(row.name)}|${normName(row.town)}`;
    if (byTown.has(key)) union(index, byTown.get(key));
    else byTown.set(key, index);
  });

  const byCounty = new Map();
  creators.forEach((row, index) => {
    if (!normName(row.county)) return;
    const key = `${row.state}|${normName(row.name)}|${normName(row.county)}`;
    if (!byCounty.has(key)) byCounty.set(key, []);
    byCounty.get(key).push(index);
  });
  for (const group of byCounty.values()) {
    for (let a = 0; a < group.length; a++) {
      for (let b = a + 1; b < group.length; b++) {
        if (!townsConflict(creators[group[a]], creators[group[b]])) union(group[a], group[b]);
      }
    }
  }

  const bare = new Map();
  creators.forEach((row, index) => {
    if (normName(row.town) || normName(row.county) || row.registerId) return;
    const key = `${row.state}|${normName(row.name)}`;
    if (!bare.has(key)) bare.set(key, []);
    bare.get(key).push(index);
  });
  for (const [key, indexes] of bare) {
    const splitAt = key.indexOf("|");
    const state = key.slice(0, splitAt);
    const name = key.slice(splitAt + 1);
    const targets = new Set();
    creators.forEach((row, index) => {
      if (row.state === state && normName(row.name) === name && (normName(row.town) || normName(row.county) || row.registerId)) {
        targets.add(find(index));
      }
    });
    if (targets.size === 1) {
      const target = [...targets][0];
      for (const index of indexes) union(index, target);
    } else {
      for (const index of indexes) union(index, indexes[0]);
    }
  }

  const groups = new Map();
  creators.forEach((row, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(row);
  });

  const items = [];
  const groupList = [...groups.values()];
  for (const members of groupList) {
    const canon = representative(members);
    const sources = members.map(sourceOf).sort(byFileRow);
    const registerIds = [...new Set(members.map((row) => row.registerId).filter(Boolean))].sort();
    const tier = members.map((row) => row.tier).filter((value) => value != null).sort((a, b) => a - b)[0] ?? canon.tier ?? null;
    let queueState = "queued";
    const creatorRows = members.filter((row) => CREATOR_ROLES.has(row.role));
    if (creatorRows.some((row) => row.role === "dead")) queueState = "checked-dead";
    else if (creatorRows.every((row) => row.role === "held")) queueState = "held";
    const item = {
      name: canon.name,
      town: canon.town || "",
      county: canon.county || "",
      state: canon.state,
      tier: tier ?? null,
      anchorPosture: canon.anchorPosture || "",
      registerId: registerIds[0] || null,
      queueState,
      sources,
    };
    item.id = leadId(item, canon.file);
    item.projectedSlug = projectSlug(item.state, item.name);
    item.targetSlug = null;
    item.reconcile = null;
    item.attempts = [];
    items.push(item);
  }

  const indexById = new Map();
  const indexByName = new Map();
  items.forEach((item, index) => {
    if (item.registerId) {
      const key = `${item.state}|${item.registerId}`;
      if (!indexById.has(key)) indexById.set(key, []);
      indexById.get(key).push(index);
    }
    const key = `${item.state}|${normName(item.name)}`;
    if (!indexByName.has(key)) indexByName.set(key, []);
    indexByName.get(key).push(index);
  });

  for (const row of attachers) {
    let hits = [];
    if (row.registerId && indexById.has(`${row.state}|${row.registerId}`)) {
      hits = indexById.get(`${row.state}|${row.registerId}`);
    } else {
      const named = indexByName.get(`${row.state}|${normName(row.name)}`) || [];
      hits = named.filter((index) => localityCompatible(row, items[index]));
    }
    if (hits.length !== 1) continue;
    const item = items[hits[0]];
    item.sources.push(sourceOf(row));
    item.sources.sort(byFileRow);
  }

  const liveStates = new Set(liveEntries.map((entry) => entry.state).filter(Boolean));
  for (const item of items) {
    const live = matchCatalog(item, liveEntries);
    const filed = live ? null : matchCatalog(item, corpusOnlyEntries);
    const hit = live || filed;
    if (hit?.ambiguous) {
      item.reconcile = "ambiguous";
      item.targetSlug = null;
    } else if (hit) {
      item.queueState = live ? "published" : "filed";
      item.reconcile = live ? "published" : "filed";
      item.targetSlug = hit.slug;
    }
  }

  items.sort((a, b) => compareResearch(a, b, liveStates));
  return {
    items: items.map((item) => ({
      id: item.id,
      projectedSlug: item.projectedSlug,
      targetSlug: item.targetSlug,
      name: item.name,
      town: item.town,
      county: item.county,
      state: item.state,
      tier: item.tier,
      anchorPosture: item.anchorPosture,
      registerId: item.registerId,
      sources: item.sources,
      queueState: item.queueState,
      reconcile: item.reconcile,
      attempts: item.attempts,
    })),
    liveStates: [...liveStates].sort(),
  };
}

function countBy(items, key) {
  const counts = {};
  for (const item of items) {
    const value = item[key] || "(blank)";
    counts[value] = (counts[value] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => (a[0] < b[0] ? -1 : 1)));
}

export function researchDocument(rows, catalog) {
  const { items } = assembleResearchQueue(rows, catalog);
  const unrecognized = {};
  for (const row of rows) {
    if (row.dialect !== "unrecognized") continue;
    const key = row.file;
    unrecognized[key] = (unrecognized[key] || 0) + 1;
  }
  return {
    version: 1,
    phase: 1,
    kind: "research",
    orderRule: "Seeding (zero live entries) by tier then march order; then depth in march order. States outside the march follow Alaska, by postal code. Unknown tier sorts last. See app/lib/machine-queue.mjs.",
    items,
    counts: {
      items: items.length,
      byQueueState: countBy(items, "queueState"),
      byState: countBy(items, "state"),
    },
    unrecognizedRowsByFile: Object.fromEntries(Object.entries(unrecognized).sort((a, b) => (a[0] < b[0] ? -1 : 1))),
  };
}

export function parseCheckedDate(markdown) {
  const match = String(markdown || "").match(/Checked\s+(\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]+\.?\s+\d{4}|[A-Za-z]+\.?\s+\d{1,2},\s*\d{4})/i);
  if (!match) return null;
  return normalizeDate(match[1]);
}

function normalizeDate(value) {
  let match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  match = value.match(/^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})$/);
  if (match) return isoDate(match[3], MONTHS[match[2].slice(0, 3).toLowerCase()], match[1]);
  match = value.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),\s*(\d{4})$/);
  if (match) return isoDate(match[3], MONTHS[match[1].slice(0, 3).toLowerCase()], match[2]);
  return null;
}

function isoDate(year, month, day) {
  if (!month || !day || !year) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}`;
}

export function verificationDocument(liveEntries, datesBySlug = {}) {
  const items = liveEntries.map((entry) => {
    const found = datesBySlug[entry.slug] || {};
    return {
      id: `vq_${entry.slug}`,
      slug: entry.slug,
      name: entry.title || entry.stableName || entry.slug,
      town: entry.town || "",
      state: entry.state || "",
      verifiedOn: found.verifiedOn || null,
      verifiedOnSource: found.verifiedOn ? "corpus-checked-line" : "unrecorded",
      corpusFile: found.corpusFile || null,
      queueState: "queued",
      attempts: [],
    };
  });
  items.sort((a, b) => {
    if (a.verifiedOn === b.verifiedOn) return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    if (a.verifiedOn == null) return -1;
    if (b.verifiedOn == null) return 1;
    if (a.verifiedOn !== b.verifiedOn) return a.verifiedOn < b.verifiedOn ? -1 : 1;
    return a.slug < b.slug ? -1 : 1;
  });
  return {
    version: 1,
    phase: 1,
    kind: "verification",
    orderRule: "Every live catalog entry, oldest verifiedOn first. A dossier with no Checked date sorts first (unrecorded), then by slug.",
    items,
    counts: { items: items.length, dated: items.filter((item) => item.verifiedOn).length, unrecorded: items.filter((item) => !item.verifiedOn).length },
  };
}

export const PHOTO_PENDING = "pending: gap report not on main";

export function photoDocument(csvText, source) {
  if (csvText == null) {
    return {
      version: 1,
      phase: 1,
      kind: "photo",
      status: PHOTO_PENDING,
      note: "photo-gaps.csv is not on main. Its generator is only on open PR #3 (branch photos-every-listing) and is not copied into this phase. This queue reads app/public/desk/photo-gaps.csv or app/data/photo-gaps.csv when one of those files is present.",
      source: null,
      items: [],
      counts: { items: 0 },
    };
  }
  const { rows } = parseCsv(csvText);
  const headers = rows[0] || [];
  const items = rows.slice(1).filter((row) => row.some((value) => value !== "")).map((row) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index] ?? "";
    });
    return item;
  });
  return {
    version: 1,
    phase: 1,
    kind: "photo",
    status: "ready",
    note: "JSON twin of photo-gaps.csv. Row order and header keys are the CSV's own.",
    source,
    items,
    counts: { items: items.length },
  };
}

export function validateResearch(doc) {
  const problems = [];
  if (!doc || doc.kind !== "research" || !Array.isArray(doc.items)) {
    return ["research queue is missing its items array"];
  }
  const ids = new Set();
  for (const item of doc.items) {
    if (!/^lq_[0-9a-f]{16}$/.test(item.id || "")) problems.push(`bad lead id ${item.id}`);
    if (ids.has(item.id)) problems.push(`duplicate lead id ${item.id}`);
    ids.add(item.id);
    if (!QUEUE_STATES.has(item.queueState)) problems.push(`${item.id} queueState ${item.queueState}`);
    if (!Array.isArray(item.attempts)) problems.push(`${item.id} attempts`);
    if (!item.name || !/^[A-Z]{2}$/.test(item.state || "")) problems.push(`${item.id} name/state`);
    if (item.tier != null && ![1, 2, 3, 4].includes(item.tier)) problems.push(`${item.id} tier`);
    if (!Array.isArray(item.sources) || item.sources.length === 0) problems.push(`${item.id} sources`);
    const creators = (item.sources || []).filter((source) => CREATOR_ROLES.has(source.role));
    if (!creators.length) problems.push(`${item.id} has no creator source (HAVE/XREF/LISTED cannot queue alone)`);
    const canon = [...creators].sort(byFileRow)[0];
    if (canon && leadId(item, canon.file) !== item.id) problems.push(`${item.id} does not match its canonical source hash`);
    for (const source of item.sources || []) {
      if (!source.file || !Number.isInteger(source.row) || !source.dialect || !source.role) {
        problems.push(`${item.id} source incomplete`);
      }
    }
    if (typeof item.anchorPosture !== "string" || typeof item.projectedSlug !== "string") problems.push(`${item.id} posture/slug`);
    if (!(item.targetSlug == null || typeof item.targetSlug === "string")) problems.push(`${item.id} targetSlug`);
  }
  return problems;
}

export function validateVerification(doc) {
  const problems = [];
  if (!doc || doc.kind !== "verification" || !Array.isArray(doc.items)) return ["verification queue is missing its items array"];
  let previous = null;
  for (const item of doc.items) {
    if (!item.slug || !item.name) problems.push("verification item missing slug/name");
    if (item.verifiedOn != null && !/^\d{4}-\d{2}-\d{2}$/.test(item.verifiedOn)) problems.push(`${item.slug} verifiedOn`);
    if (!["corpus-checked-line", "unrecorded"].includes(item.verifiedOnSource)) problems.push(`${item.slug} verifiedOnSource`);
    if (!Array.isArray(item.attempts) || item.queueState !== "queued") problems.push(`${item.slug} state/attempts`);
    if (previous) {
      const order = previous.verifiedOn === item.verifiedOn
        ? previous.slug <= item.slug
        : previous.verifiedOn == null || (item.verifiedOn != null && previous.verifiedOn <= item.verifiedOn);
      if (!order) problems.push(`verification order breaks at ${item.slug}`);
    }
    previous = item;
  }
  return problems;
}

export function validatePhoto(doc) {
  const problems = [];
  if (!doc || doc.kind !== "photo" || !Array.isArray(doc.items)) return ["photo queue is missing its items array"];
  if (doc.status !== PHOTO_PENDING && doc.status !== "ready") problems.push(`photo status ${doc.status}`);
  if (doc.status === PHOTO_PENDING && doc.items.length) problems.push("pending photo queue must be empty");
  if (doc.status === "ready" && !doc.source) problems.push("ready photo queue needs a source path");
  for (const item of doc.items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) problems.push("photo item is not an object");
  }
  return problems;
}

export function diffText(expected, actual) {
  if (expected === actual) return "";
  const a = expected.split("\n");
  const b = actual.split("\n");
  const limit = Math.max(a.length, b.length);
  for (let i = 0; i < limit; i++) {
    if (a[i] !== b[i]) return `line ${i + 1} differs`;
  }
  return "byte length differs";
}

function lightDossier(filename, text) {
  const base = filename.replace(/\.md$/, "").replace(/^HT-RES-/, "").replace(/-U250-R02$/, "");
  const title = ((text.match(/^#\s+(.+)$/m) || [])[1] || base).replace(/\s+/g, " ").trim();
  const coded = base.match(/^([A-Z]{2})-/);
  const town = ((text.match(/\|\s*Town\s*\|\s*([^|\n]+)\|/i) || [])[1] || "").trim();
  const stableName = ((text.match(/\|\s*Stable site name\s*\|\s*([^|\n]+)\|/i) || [])[1] || "").trim();
  return {
    slug: base,
    title,
    stableName,
    town,
    state: coded ? coded[1] : "",
    corpusFile: filename,
    verifiedOn: parseCheckedDate(text),
  };
}

function dossierFiles(dir) {
  if (!dir || !existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.startsWith("HT-RES-") && name.endsWith(".md"))
    .sort()
    .map((name) => ({ name, text: readFileSync(join(dir, name), "utf8") }));
}

export function readCatalog(appRoot) {
  const sitesPath = join(appRoot, "data", "sites.json");
  const sites = existsSync(sitesPath) ? JSON.parse(readFileSync(sitesPath, "utf8")) : [];
  const liveEntries = sites.map((site) => ({
    slug: site.slug,
    title: site.title || "",
    stableName: site.locator?.stableName || "",
    town: site.town || "",
    state: site.stateCode || "",
  }));
  const liveSlugs = new Set(liveEntries.map((entry) => entry.slug));
  const datesBySlug = {};
  const corpusOnly = [];
  const seen = new Map();
  for (const dir of [join(appRoot, "..", "corpus"), join(appRoot, "..")]) {
    for (const file of dossierFiles(dir)) {
      const dossier = lightDossier(file.name, file.text);
      const revision = /-U250-R02\.md$/.test(file.name);
      const prev = seen.get(dossier.slug);
      if (prev && prev.revision && !revision) continue;
      seen.set(dossier.slug, { revision, dossier });
    }
  }
  for (const { dossier } of seen.values()) {
    datesBySlug[dossier.slug] = dossier;
    if (!liveSlugs.has(dossier.slug)) corpusOnly.push(dossier);
  }
  return { liveEntries, corpusOnlyEntries: corpusOnly, datesBySlug };
}

export function loadSourceRows(sourcesDir) {
  const rows = [];
  const missing = [];
  for (const name of CURRENT_SOURCE_FILES) {
    const path = join(sourcesDir, name);
    if (!existsSync(path)) {
      missing.push(name);
      continue;
    }
    rows.push(...parseSourceText(name, readFileSync(path, "utf8")));
  }
  if (missing.length) {
    throw new Error(`machine sources missing: ${missing.join(", ")}`);
  }
  return rows;
}

export function locatePhotoCsv(appRoot) {
  for (const relative of ["public/desk/photo-gaps.csv", "data/photo-gaps.csv"]) {
    const path = join(appRoot, relative);
    if (existsSync(path)) return { relative: `app/${relative}`, text: readFileSync(path, "utf8") };
  }
  return null;
}

export function buildQueues(appRoot) {
  const sourcesDir = join(appRoot, "desk", "machine-sources");
  const rows = loadSourceRows(sourcesDir);
  const catalog = readCatalog(appRoot);
  const photo = locatePhotoCsv(appRoot);
  return {
    research: researchDocument(rows, catalog),
    verification: verificationDocument(catalog.liveEntries, catalog.datesBySlug),
    photo: photoDocument(photo ? photo.text : null, photo ? photo.relative : null),
  };
}

export function schemaProblems(queues) {
  return [
    ...validateResearch(queues.research).map((problem) => `research: ${problem}`),
    ...validateVerification(queues.verification).map((problem) => `verification: ${problem}`),
    ...validatePhoto(queues.photo).map((problem) => `photo: ${problem}`),
  ];
}
