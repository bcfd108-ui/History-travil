// History Travel — corpus converter.
// Parses the research dossiers in ~/workspace/history-travel/corpus/ (plus the
// four home-bench dossiers at ~/workspace/history-travel/) into structured JSON
// the app reads. Fidelity rules come from PUBLISH_CORPUS_MANIFEST.md:
//   - the dossier's own words carry over; nothing is invented or smoothed
//   - blanks stay blank (locators, coordinates)
//   - reflection ground carries NO find/game elements
//   - §8 "candidate finds" apparatus (blank Answer:/Key: fields, question-shaped
//     prompts) is NEVER surfaced — it is the trivia shape the product law rules
//     out. Only declarative, apparatus-free candidate lines survive, verbatim,
//     labelled as unactivated candidates from the research record.
// Dossiers arrive in three shapes: the standard 10-part template; a variant
// with §1 as a bold header line; and a home-bench 8-part scheme. Sections are
// therefore mapped by title keywords first, section numbers second.
// Run: node scripts/convert.mjs   (also runs as part of `npm run build`)
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const corpusDir = join(appRoot, "..", "corpus");
const homeDir = join(appRoot, "..");
const outDir = join(appRoot, "data");

const STATE_NAMES = {
  ID: "Idaho", WA: "Washington", OR: "Oregon", MT: "Montana", WY: "Wyoming",
  UT: "Utah", NV: "Nevada", CA: "California", CO: "Colorado",
};
// Uncoded (home-bench) slugs: slug -> [town, stateCode]
const LOCAL = {
  "bayhorse": ["Bayhorse", "ID"],
  "bunker-hill-kellogg": ["Kellogg", "ID"],
  "cataldo-mission": ["Cataldo", "ID"],
  "celilo-falls": ["Celilo", "OR"],
  "custer-yankee-fork": ["Custer", "ID"],
  "fort-sherman": ["Coeur d'Alene", "ID"],
  "lewiston-confluence": ["Lewiston", "ID"],
  "lewiston-depot": ["Lewiston", "ID"],
  "lewiston-locomotive-park": ["Lewiston", "ID"],
  "lewiston-main-street": ["Lewiston", "ID"],
  "lewiston-normal-hill": ["Lewiston", "ID"],
  "murray": ["Murray", "ID"],
  "pierce": ["Pierce", "ID"],
  "spokane-fire-1889": ["Spokane", "WA"],
  "st-joe-st-maries": ["St. Maries", "ID"],
};

const THEME_KEYWORDS = {
  "Railroad": ["railroad", "railway", "depot", "locomotive", "train ", "trains"],
  "Mining": ["mining", "mine ", "mines", "gold rush", "ore ", "prospect", "silver city"],
  "Timber": ["timber", "lumber", "logging", "sawmill", "loggers"],
  "Fire": ["firefigh", "wildfire", "fire department", "smokejumper", "big burn", "fire station"],
  "Labor": ["labor", "union", "strike", "workers", "organizing", "organizers"],
  "Indigenous histories": ["indigenous", "tribal", "tribe", "nez perce", "shoshone", "paiute", "native people"],
  "Immigration": ["immigrant", "immigration", "newcomers", "boardinghouse"],
  "Agriculture": ["farm", "ranch", "wheat", "potato", "cattle", "sheep", "agricultur"],
  "Military": ["fort ", "military", "army", "soldier", "cavalry", "world war"],
  "Rivers & water": ["river", "dam ", "falls", "canal", "irrigation", "reservoir"],
  "Faith & missions": ["mission", "church", "temple", "tabernacle", "synagogue", "cathedral"],
  "Education": ["school", "university", "college", "students", "education"],
  "Civil rights": ["civil rights", "segregation", "suffrage", "african american", "black history", "voting"],
  "Industry & energy": ["power plant", "hydroelectric", "factory", "mill ", "oil ", "coal", "smelter"],
  "Trade & transport": ["ferry", "steamboat", "shipping", "freight", "stagecoach", "pony express"],
};

// Split on `## N.` headers; also synthesise §1 from a bold `**1. ...**` header
// line (variant format) when no `## 1.` exists.
function splitSections(md) {
  const sections = {};
  const re = /^## (\d+)\.\s*(.*)$/gm;
  const heads = [];
  let m;
  while ((m = re.exec(md)) !== null) heads.push({ n: +m[1], title: m[2].trim(), at: m.index, bodyAt: re.lastIndex });
  heads.forEach((h, i) => {
    const end = i + 1 < heads.length ? heads[i + 1].at : md.length;
    sections[h.n] = { title: h.title, body: md.slice(h.bodyAt, end).trim() };
  });
  let boldSec1 = false;
  if (!sections[1]) {
    const b = md.match(/^\*\*1\.\s+(.+?)\*\*\s*$/m);
    if (b) { sections[1] = { title: "Trip gate", body: b[1].trim() }; boldSec1 = true; }
  }
  return { sections, boldSec1 };
}

// Sections are also recognised when they carry no number (home-bench scheme:
// titled `##` headers). splitSections only catches numbered ones, so collect
// titled sections too and merge, numbered first.
function splitTitled(md) {
  const out = [];
  const re = /^## (.+)$/gm;
  const heads = [];
  let m;
  while ((m = re.exec(md)) !== null) {
    if (/^\d+\./.test(m[1].trim())) continue; // numbered — handled elsewhere
    heads.push({ title: m[1].trim(), at: m.index, bodyAt: re.lastIndex });
  }
  heads.forEach((h, i) => {
    const end = i + 1 < heads.length ? heads[i + 1].at : md.length;
    out.push({ title: h.title, body: md.slice(h.bodyAt, end).trim() });
  });
  return out;
}

function mapSections(sections, titled) {
  const vals = [
    ...Object.entries(sections).map(([n, s]) => ({ n: +n, ...s })),
    ...titled.map((s, i) => ({ n: 100 + i, ...s })),
  ];
  const used = new Set();
  const take = (s) => { if (s) used.add(s); return s || null; };
  const byTitle = (re) => vals.find((s) => !used.has(s) && re.test(s.title));
  const num = (n) => sections[n] && !used.has(sections[n]) ? sections[n] : null;

  // Candidate-finds sections: only the standard scheme's exact §8 title is
  // mechanically converted. Variant candidate sections (Lewiston LD-01,
  // St. Joe §6, Celilo §5) are individually gated in the record and are
  // withheld here rather than converted blind.
  const candSec = vals.find((s) => /^candidate finds/i.test(s.title)) || null;
  const anyCandSec = byTitle(/candidate|scavenger/i);
  const locatorSec = vals.filter((s) => /locator/i.test(s.title)).sort((a, b) => b.n - a.n)[0] || sections[10] || null;

  let lead = "";
  let gate = byTitle(/trip gate/i) || byTitle(/field-photo gate|trip-shaping/i);
  if (!gate) {
    const s1 = sections[1], s2 = sections[2];
    if (s1 && /interpretive proposition/i.test(s1.title)) { lead = s1.body; used.add(s1); }
    else if (s1 && s2 && /story|narrative/i.test(s2.title) && !/story|narrative/i.test(s1.title)) gate = take(s1);
  }
  if (gate) used.add(gate);
  if (!gate) gate = take(byTitle(/access/i));

  const story = take(byTitle(/the story|narrative|original story/i)) || take(num(2));
  const thenNow = take(byTitle(/then\s*\/\s*now/i)) || take(num(3));
  const progression = take(byTitle(/progression|stop order|runnable/i)) || take(num(5) && !/candidate|scavenger/i.test(sections[5].title) ? sections[5] : null);
  const stillThere = take(byTitle(/still there|surviving features/i)) || take(num(4) && !/stop order|runnable|candidate|progression/i.test(sections[4].title) ? sections[4] : null);
  const gaps = take(byTitle(/gap/i)) || take(num(6));
  const photoRecord = take(byTitle(/photo record/i)) || take(num(7) && !/source/i.test(sections[7].title) ? sections[7] : null);
  const sources = take(byTitle(/source/i)) || take(num(9));
  if (locatorSec) used.add(locatorSec);
  if (candSec) used.add(candSec);
  if (anyCandSec) used.add(anyCandSec);
  // Nothing is silently dropped: unmapped sections ride along in order.
  const moreSections = vals.filter((s) => !used.has(s) && s.body).map((s) => ({ title: s.title, body: s.body }));
  return { lead, gate, story, thenNow, stillThere, progression, gaps, photoRecord, sources, locatorSec, candSec, moreSections };
}

function parseLocator(sec) {
  const pairs = [];
  if (!sec) return pairs;
  const body = sec.body.replace(/```[a-z]*\n?/g, "").replace(/```/g, "");
  for (const rawLine of body.split("\n")) {
    let line = rawLine.trim().replace(/^[-*]\s+/, "").replace(/^\|\s*/, "").replace(/\s*\|$/, "");
    if (!line) continue;
    const cell = line.match(/^\|?\s*([^:|]{2,60}?)\s*\|\s*(.*)$/);
    const m = cell || line.match(/^\*{0,2}([^:*]{2,60}?)\*{0,2}:\s*(.*)$/);
    if (m) pairs.push({ key: m[1].trim().replace(/_/g, " "), value: m[2].trim() });
    else if (pairs.length && !/^#/.test(line)) pairs[pairs.length - 1].value += " " + line;
  }
  return pairs;
}

function pick(pairs, test) {
  const p = pairs.find((p) => test(p.key.toLowerCase()));
  return p ? p.value : "";
}

// Candidate-finds extraction: title-gated section only; apparatus, questions,
// research prompts and field lines are dropped and counted. Survivors are the
// dossier's own declarative lines, verbatim.
function extractCandidates(candSec, isReflection) {
  const out = { candidates: [], hadApparatus: false, questionPrompts: 0, fieldLines: 0, totalBullets: 0 };
  if (!candSec) return out;
  const body = candSec.body;
  if (/answer\s*:|answer key|unlock key|^\s*key\s*:/im.test(body)) out.hadApparatus = true;
  if (isReflection) return out; // reflection ground: NO find elements, ever
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    const bm = line.match(/^(?:[-*]|\d+[.)])\s+(.*)$/);
    if (!bm) continue;
    out.totalBullets++;
    let text = bm[1].trim();
    const label = text.match(/^\*\*([^*]+)\*\*\s*(.*)$/);
    if (label) {
      if (/reflection|unscored/i.test(label[1])) { out.questionPrompts++; continue; } // reflection prompt, not a find
      text = label[2].trim();
    }
    text = text.replace(/\*\*/g, "").trim();
    if (/answer|key\s*:/i.test(text)) { out.hadApparatus = true; continue; }
    if (/^(reflection|optional|note)\b/i.test(text)) continue;
    if (!label && /^[A-Z][\w' ]{2,40}:\s/.test(text)) { out.fieldLines++; continue; } // locator-style field line
    if (text.includes("?")) { out.questionPrompts++; continue; }
    if (/^(identify|which|what|how|can a|distinguish|record|notice|consider|determine|name|compare|if|when|look|read|note|examine|check|use|using)\b/i.test(text)) { out.questionPrompts++; continue; }
    // Prohibition / placeholder lines are not finds ("...targets: none", label-only lines).
    if (/:\s*none\.?$/i.test(text) || /:$/.test(text)) { out.fieldLines++; continue; }
    // Abstract reading observations are not photographable finds.
    if (/^(a|the)\s+(distinction|difference|separation|contrast|relationship)\b/i.test(text)) { out.questionPrompts++; continue; }
    // Trim an imperative observation tail, keeping the named object itself.
    const tail = text.match(/^(.*?:)\s*(note|compare|distinguish|identify|record|check|examine)\b.*$/i);
    if (tail) text = tail[1].replace(/:$/, "").trim();
    if (text.length >= 25) out.candidates.push(text);
  }
  return out;
}

function convert(filePath, origin) {
  const md = readFileSync(filePath, "utf8");
  const base = filePath.split("/").pop().replace(/\.md$/, "").replace(/^HT-RES-/, "");
  const isRevision = /-U250-R02$/.test(base);
  const slug = base.replace(/-U250-R02$/, "");
  const lines = md.split("\n");
  const titleLine = lines.find((l) => l.startsWith("# "));
  const title = titleLine ? titleLine.replace(/^#\s+/, "").replace(/^HT-RES\s*—\s*/, "").trim() : slug;
  const { sections, boldSec1 } = splitSections(md);
  const S = mapSections(sections, splitTitled(md));
  // Preamble: between the title line and the first section header of any kind.
  let preamble = "";
  if (titleLine) {
    const after = md.slice(md.indexOf(titleLine) + titleLine.length);
    const cut = after.search(/^## \d+\.|^\*\*1\.\s/m);
    preamble = (cut >= 0 ? after.slice(0, cut) : "").replace(/^\*\*1\..*$/m, "").trim();
  }

  let stateCode = null, town = null;
  const codeMatch = slug.match(/^([A-Z]{2})-/);
  if (codeMatch && STATE_NAMES[codeMatch[1]]) stateCode = codeMatch[1];
  else if (LOCAL[slug]) { town = LOCAL[slug][0]; stateCode = LOCAL[slug][1]; }

  const pairs = parseLocator(S.locatorSec);
  const locator = {
    stableName: pick(pairs, (k) => k.includes("stable name") || k.includes("stable site name")),
    address: pick(pairs, (k) => k.includes("address")),
    latitude: pick(pairs, (k) => k === "latitude"),
    longitude: pick(pairs, (k) => k === "longitude"),
    coordinateSource: pick(pairs, (k) => k.includes("coordinate source") || k.includes("coordinate note") || k.includes("coordinate scope")),
    nrhp: pick(pairs, (k) => k.includes("nrhp") || k.includes("national register") || k.includes("register number")),
    hmdb: pick(pairs, (k) => k.includes("hmdb") || k.includes("historical marker")),
    ark: pick(pairs, (k) => k === "ark"),
    archiveId: pick(pairs, (k) => k.includes("archive id") || k.includes("archive item") || k.includes("archive collection")),
    registerUrl: pick(pairs, (k) => k.includes("register url")),
    operator: pick(pairs, (k) => k === "operator"),
    extra: pairs.filter((p) => {
      const k = p.key.toLowerCase();
      return !(k.includes("stable name") || k.includes("stable site name") || k.includes("address") || k === "latitude" || k === "longitude" ||
        k.includes("coordinate source") || k.includes("coordinate note") || k.includes("coordinate scope") || k.includes("nrhp") || k.includes("national register") ||
        k.includes("register number") || k.includes("hmdb") || k.includes("historical marker") || k === "ark" ||
        k.includes("archive id") || k.includes("archive item") || k.includes("archive collection") || k.includes("register url") || k === "operator");
    }),
  };
  let coordinates = null, coordinateKind = "";
  const lat = parseFloat(locator.latitude), lon = parseFloat(locator.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lon)) { coordinates = { lat, lon }; coordinateKind = "locator latitude/longitude fields"; }
  else {
    const cp = pairs.find((p) => /coordinate/i.test(p.key) && /-?\d{1,3}\.\d+\s*,\s*-?\d{1,3}\.\d+/.test(p.value));
    if (cp) {
      const mm = cp.value.match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
      coordinates = { lat: +mm[1], lon: +mm[2] };
      coordinateKind = "coordinate pair printed in the locator record";
      if (!locator.coordinateSource) locator.coordinateSource = cp.key + ": " + cp.value;
    }
  }

  if (!town && locator.address) {
    const am = locator.address.match(/,\s*([^,]+?),\s*[A-Z]{2}\s*\d{5}/);
    if (am) town = am[1].trim();
  }
  if (!town && S.gate) {
    const gm = S.gate.body.match(/([A-Z][A-Za-z .'-]+),\s*(?:ID|WA|OR|MT|WY|UT|NV|CA|CO)\s*\d{5}/);
    if (gm) town = gm[1].trim();
  }

  const candHead = S.candSec ? S.candSec.body.split("\n").filter(Boolean).slice(0, 3).join(" ") : "";
  const signals = {
    slug: slug.includes("reflection"),
    candSec: /reflection (prompts )?only|witness only|witness-only|none:?\s*reflection|no hunt, scoring/i.test(S.candSec?.body || "") || /reflection only|witness only/i.test(candHead),
    preamble: /reflection|sacred/i.test(preamble),
    gate: /reflection (stop|ground|only)/i.test(S.gate?.body || "") || /sacred (site|ground)|not a (game|hunt)/i.test((S.gate?.body || "") + " " + S.lead),
  };
  const isReflection = signals.slug || signals.candSec || signals.preamble || signals.gate;
  const stopType = isReflection ? "reflection" : "view";

  const cand = extractCandidates(S.candSec, isReflection);

  const hay = (title + " " + (S.story?.body || "")).toLowerCase();
  const themes = Object.entries(THEME_KEYWORDS)
    .map(([name, kws]) => [name, kws.reduce((n, kw) => n + (hay.split(kw).length - 1), 0)])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => name);

  return {
    site: {
      id: "HT-" + slug,
      slug,
      title,
      town: town || "",
      state: stateCode ? STATE_NAMES[stateCode] : "",
      stateCode: stateCode || "",
      division: stateCode ? STATE_NAMES[stateCode] : "",
      themes,
      stopType,
      standfirst: preamble,
      lead: S.lead || "",
      access: S.gate?.body || "",
      story: S.story?.body || "",
      thenNow: S.thenNow?.body || "",
      stillThere: S.stillThere?.body || "",
      progression: S.progression?.body || "",
      gaps: S.gaps?.body || "",
      photoRecord: S.photoRecord?.body || "",
      moreSections: S.moreSections || [],
      sources: S.sources?.body || "",
      locator,
      coordinates,
      coordinateKind,
      candidateFinds: cand.candidates,
      publishedAs: "Published research — the record, with its gaps printed. Not yet field-proven.",
    },
    meta: { slug, origin, isRevision, boldSec1, altScheme: !sections[10] && !!S.locatorSec, moreCount: (S.moreSections || []).length, signals, cand, hasCoordinates: !!coordinates, coordinateKind },
  };
}

// ---- collect files: corpus first, then home-bench root; latest revision wins
const bySlug = new Map();
const collisions = [];
function ingest(filePath, origin) {
  const { site, meta } = convert(filePath, origin);
  const prev = bySlug.get(site.slug);
  if (prev) {
    collisions.push(`${site.slug}: ${prev.meta.origin}${prev.meta.isRevision ? " (R02)" : ""} vs ${origin}${meta.isRevision ? " (R02)" : ""}`);
    if (prev.meta.isRevision && !meta.isRevision) return;
  }
  bySlug.set(site.slug, { site, meta });
}
for (const f of readdirSync(corpusDir).filter((f) => f.startsWith("HT-RES-") && f.endsWith(".md")).sort())
  ingest(join(corpusDir, f), "corpus");
for (const f of readdirSync(homeDir).filter((f) => f.startsWith("HT-RES-") && f.endsWith(".md")).sort())
  ingest(join(homeDir, f), "home-bench root");

const sites = [...bySlug.values()].map((v) => v.site)
  .sort((a, b) => a.state.localeCompare(b.state) || a.title.localeCompare(b.title));
const metas = [...bySlug.values()].map((v) => v.meta);

const index = sites.map((s) => ({
  slug: s.slug, title: s.title, town: s.town, state: s.state, stateCode: s.stateCode,
  themes: s.themes, stopType: s.stopType,
  hasCoordinates: !!s.coordinates, hasLocator: !!(s.locator.nrhp || s.locator.hmdb || s.locator.ark || s.locator.archiveId),
}));

const perState = {};
for (const s of sites) perState[s.stateCode] = (perState[s.stateCode] || 0) + 1;
const stats = {
  generatedFrom: "corpus dossiers (~/workspace/history-travel/corpus + home-bench root)",
  filesSeen: metas.length + collisions.length,
  sitesConverted: sites.length,
  perState,
  withCoordinates: sites.filter((s) => s.coordinates).length,
  coordinateKinds: {
    locatorFields: metas.filter((m) => m.coordinateKind.startsWith("locator")).length,
    printedPair: metas.filter((m) => m.coordinateKind.startsWith("coordinate pair")).length,
  },
  withAnyLocatorId: index.filter((i) => i.hasLocator).length,
  withNrhp: sites.filter((s) => s.locator.nrhp).length,
  withHmdb: sites.filter((s) => s.locator.hmdb).length,
  blankCoordinates: sites.filter((s) => !s.coordinates).length,
  reflection: sites.filter((s) => s.stopType === "reflection").length,
  view: sites.filter((s) => s.stopType === "view").length,
  reflectionSignals: {
    slug: metas.filter((m) => m.signals.slug).length,
    candSec: metas.filter((m) => m.signals.candSec).length,
    preamble: metas.filter((m) => m.signals.preamble).length,
    gate: metas.filter((m) => m.signals.gate).length,
  },
  formatVariants: {
    boldSection1: metas.filter((m) => m.boldSec1).length,
    altLocatorScheme: metas.filter((m) => m.altScheme).length,
  },
  sec8ApparatusSeen: metas.filter((m) => m.cand.hadApparatus).length,
  sec8BulletsSeen: metas.reduce((n, m) => n + m.cand.totalBullets, 0),
  sec8QuestionPromptsDropped: metas.reduce((n, m) => n + m.cand.questionPrompts, 0),
  sec8FieldLinesDropped: metas.reduce((n, m) => n + m.cand.fieldLines, 0),
  candidateFindsSurfaced: sites.reduce((n, s) => n + s.candidateFinds.length, 0),
  sitesWithCandidates: sites.filter((s) => s.candidateFinds.length).length,
  townsRecorded: sites.filter((s) => s.town).length,
  emptyAccess: sites.filter((s) => !s.access).length,
  emptyStory: sites.filter((s) => !s.story).length,
  unmappedSectionsCarried: metas.reduce((n, m) => n + (m.moreCount || 0), 0),
  collisions,
};

if (!existsSync(outDir)) throw new Error("data/ dir missing");
writeFileSync(join(outDir, "sites.json"), JSON.stringify(sites, null, 1));
writeFileSync(join(outDir, "index.json"), JSON.stringify(index));
writeFileSync(join(outDir, "stats.json"), JSON.stringify(stats, null, 2));
console.log(JSON.stringify(stats, null, 2));
