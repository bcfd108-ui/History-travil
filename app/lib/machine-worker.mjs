// Phase 2 research worker. Pure checks live here. The script in
// scripts/machine-research.mjs does the I/O. No key is read in this file.
//
// Cap and schedule come from app/machine/worker.config.json. Its provider
// and model declare the selected route, validated against the free-only boundary.
// The GitHub Actions cron is checked against the same schedule.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normId, normName, parseCheckedDate, validateResearch } from "./machine-queue.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

export const SECRET_NAME = "MACHINE_RESEARCH_OPENROUTER_KEY";
const FREE_PROVIDER = "openrouter";
const FREE_MODEL = "nvidia/nemotron-3.5-super-vl:free";
export const RUN_BRANCH_PREFIX = "machine/research-run-";
export const WORKFLOW_PATH = ".github/workflows/machine-research.yml";

const SKIP_STATES = new Set(["filed", "published", "checked-dead", "held"]);

const STOP_WORDS = new Set([
  "the", "and", "of", "for", "a", "an", "at", "in", "on", "to", "from", "by",
  "national", "park", "historic", "historical", "site", "sites", "house",
  "county", "state", "museum", "building", "old", "new", "center", "centre",
  "district", "home", "public", "american", "united", "states", "monument",
  "memorial", "trail", "area", "place", "grounds",
]);

const PAYWALL_HOSTS = [
  "jstor.org",
  "newspapers.com",
  "ancestry.com",
  "fold3.com",
  "newspaperarchive.com",
  "genealogybank.com",
  "proquest.com",
  "ancestryinstitution.com",
];

const SECTION_RULES = [
  [2, /^story$/i],
  [3, /^then and now$/i],
  [4, /^surviving features and access$/i],
  [5, /^public trip progression$/i],
  [6, /^gaps and conflicts$/i],
  [7, /^historical photo records$/i],
  [8, /^optional observations$/i],
  [9, /^sources$/i],
  [10, /^structured locator$/i],
];

export function loadWorkerConfig(appRoot = join(HERE, "..")) {
  const path = join(appRoot, "machine", "worker.config.json");
  const config = JSON.parse(readFileSync(path, "utf8"));
  const problems = configProblems(config);
  if (problems.length) throw new Error(problems.join("; "));
  return config;
}

export function configProblems(config) {
  const problems = [];
  if (!config || typeof config !== "object" || Array.isArray(config)) return ["worker config is missing"];
  if (config.provider !== FREE_PROVIDER) problems.push("provider must be openrouter");
  if (config.model !== FREE_MODEL) problems.push(`model must be ${FREE_MODEL}`);
  if (config.secretName !== SECRET_NAME) problems.push(`secretName must be ${SECRET_NAME}`);
  const allowed = new Set(["provider", "model", "secretName", "perRunCap", "schedule"]);
  if (Object.keys(config).some((key) => !allowed.has(key))) problems.push("worker config contains unsupported fields");
  if (!Number.isInteger(config.perRunCap) || config.perRunCap < 1) problems.push("perRunCap must be a positive integer");
  if (typeof config.schedule !== "string" || !/^\S+(?:\s+\S+){4}$/.test(config.schedule)) problems.push("schedule must be a five-field cron");
  return problems;
}

export function workflowCron(workflowText) {
  const match = String(workflowText || "").match(/^\s*-\s*cron:\s*["']([^"']+)["']\s*$/m);
  return match ? match[1] : "";
}

export function actionable(item) {
  return !!item && !SKIP_STATES.has(item.queueState);
}

export function requiresReading(lead) {
  const posture = `${lead?.anchorPosture || ""} ${lead?.name || ""}`;
  return /\bNONE\b|NO-ANCHOR|no independently verified public entrance|research reading|\breflection\b/i.test(posture);
}

export function isReflectionLead(lead) {
  return /\breflection\b/i.test(`${lead?.anchorPosture || ""} ${lead?.name || ""}`);
}

function words(value) {
  return normName(value).split(" ").filter(Boolean);
}

function distinctive(value) {
  return words(value).filter((word) => word.length >= 5 && !STOP_WORDS.has(word));
}

function wholeWordContains(longer, shorter) {
  if (!shorter || !longer || shorter === longer) return false;
  if (shorter.length < 8) return false;
  return ` ${longer} `.includes(` ${shorter} `);
}

function townsConflict(a, b) {
  const left = normName(a);
  const right = normName(b);
  return Boolean(left && right && left !== right);
}

function entryNames(entry) {
  return [entry.title, entry.stableName, String(entry.slug || "").replace(/-/g, " ")].map(normName).filter(Boolean);
}

export function suspectDuplicate(lead, entries) {
  const name = normName(lead?.name);
  const leadId = normId(lead?.registerId);
  for (const entry of entries || []) {
    if (!entry || (entry.state && lead?.state && entry.state !== lead.state)) continue;
    const register = normId(entry.registerId);
    if (leadId && register && leadId === register) {
      return { reason: "register-id", match: entry.slug || entry.title || entry.stableName || register };
    }
    if (townsConflict(lead?.town, entry.town)) continue;
    for (const candidate of entryNames(entry)) {
      if (name && candidate === name) {
        return { reason: "exact-name", match: entry.slug || entry.title || candidate };
      }
      if (wholeWordContains(candidate, name) || wholeWordContains(name, candidate)) {
        return { reason: "name-containment", match: entry.slug || entry.title || candidate };
      }
    }
    const leadTown = normName(lead?.town);
    const entryTown = normName(entry.town);
    if (leadTown && entryTown && leadTown === entryTown) {
      const shared = distinctive(lead?.name).filter((word) => distinctive(entry.title).includes(word) || distinctive(entry.stableName).includes(word));
      if (shared.length) {
        return { reason: "town-and-distinctive-word", match: `${entry.slug || entry.title || entry.stableName} (${shared[0]})` };
      }
    }
  }
  return null;
}

export function dossierSlug(state, name) {
  const body = normName(name).replace(/\s+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  return `${String(state || "").toUpperCase()}-${body}`;
}

export function dossierRepoPath(state, name) {
  return `corpus/HT-RES-${dossierSlug(state, name)}.md`;
}

export function formatCheckedDate(date) {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

function sectionMap(markdown) {
  const sections = new Map();
  const re = /^##\s+(\d+)\.\s+(.+)$/gm;
  const marks = [];
  let match;
  while ((match = re.exec(markdown))) marks.push({ n: Number(match[1]), title: match[2].trim(), at: match.index, bodyAt: re.lastIndex });
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].at : markdown.length;
    sections.set(marks[i].n, { title: marks[i].title, body: markdown.slice(marks[i].bodyAt, end).trim() });
  }
  return sections;
}

function locatorPairs(body) {
  const pairs = {};
  for (const raw of String(body || "").split("\n")) {
    const line = raw.trim().replace(/^[-*]\s+/, "");
    const match = line.match(/^([^:]{2,60}):\s*(.*)$/);
    if (match) pairs[normName(match[1])] = match[2].trim();
  }
  return pairs;
}

function urlsIn(text) {
  return String(text || "").match(/https?:\/\/[^\s)>\]]+/g) || [];
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isPaywalled(url) {
  const host = hostOf(url);
  return PAYWALL_HOSTS.some((paywall) => host === paywall || host.endsWith(`.${paywall}`));
}

function blankValue(value) {
  return !value || /^(none|blank|no visitor pin)\b/i.test(value);
}

function hasScoredLanguage(text) {
  const cleaned = String(text || "")
    .replace(/no find is filed\.?/gi, "")
    .replace(/\bno route\b/gi, "")
    .replace(/\bnot a route\b/gi, "")
    .replace(/\bno hunt\b/gi, "");
  return /\b(hunt|hunts|score|scored|points)\b|\bfind\b|\broute\b/i.test(cleaned);
}

export function parseWorkerDossier(markdown) {
  const text = String(markdown || "").replace(/^\uFEFF/, "").trim();
  const gateMatch = text.match(/^\*\*Trip gate[\s\S]*?\*\*/);
  const sections = sectionMap(text);
  const locator = locatorPairs(sections.get(10)?.body || "");
  return { text, gate: gateMatch ? gateMatch[0] : "", sections, locator };
}

export function validateDossier(markdown, { lead, entries = [], existingSlugs = new Set() } = {}) {
  const problems = [];
  const parsed = parseWorkerDossier(markdown);
  if (!parsed.gate) problems.push("trip gate must be the opening bold line");
  else if (!parseCheckedDate(parsed.gate)) problems.push("trip gate has no Checked date");
  for (const [number, title] of SECTION_RULES) {
    const section = parsed.sections.get(number);
    if (!section) problems.push(`missing section ${number}`);
    else if (!title.test(section.title)) problems.push(`section ${number} title is ${section.title}`);
  }
  const story = parsed.sections.get(2)?.body || "";
  const progression = parsed.sections.get(5)?.body || "";
  const gaps = parsed.sections.get(6)?.body || "";
  const photos = parsed.sections.get(7)?.body || "";
  const observations = parsed.sections.get(8)?.body || "";
  const sources = parsed.sections.get(9)?.body || "";
  if (story.length < 200) problems.push("story is too short to be a dossier");
  if (!/research draft/i.test(story)) problems.push("story must be marked as a research draft");
  if (!/\[\d+/.test(`${parsed.gate}\n${story}`)) problems.push("trip gate or story has no source citation");
  if (gaps.length < 40) problems.push("gaps and conflicts is empty");
  if (!/no frame adopted/i.test(photos)) problems.push("photo section must say no frame is adopted");
  if (/!\[[^\]]*\]\([^)]+\)/.test(parsed.text)) problems.push("dossier embeds an image");
  if (!/no find is filed/i.test(observations)) problems.push("observations must say no find is filed");
  if (hasScoredLanguage(observations) || hasScoredLanguage(progression)) problems.push("progression or observations carries a find, route, or score");
  const stableName = parsed.locator["stable site name"] || "";
  const anchor = parsed.locator["public anchor"] || "";
  if (!stableName) problems.push("locator has no stable site name");
  const reading = requiresReading(lead) || /\bnone\b|no-anchor|research reading/i.test(anchor);
  if (reading && !/\bnone\b|no-anchor|research reading/i.test(anchor)) problems.push("a lead with no lawful public anchor must file as a reading");
  if (!reading && blankValue(anchor)) problems.push("a routed stop needs a public anchor, or the lead must file as a reading");
  if (reading && !/reading/i.test(progression)) problems.push("a reading must say so in the public progression");
  if (isReflectionLead(lead) && hasScoredLanguage(`${progression}\n${observations}`)) problems.push("reflection ground carries a find, route, or score");
  if (/\b(haunt|ghost|legend)\b/i.test(`${lead?.anchorPosture || ""} ${lead?.name || ""}`) && !/\blore\b/i.test(parsed.text)) {
    problems.push("haunted material must be labeled lore and kept apart from the record");
  }
  const sourceUrls = urlsIn(sources);
  const freeUrls = sourceUrls.filter((url) => !isPaywalled(url));
  const paywalled = sourceUrls.filter(isPaywalled);
  if (!freeUrls.length) problems.push("sources cite no free record");
  for (const url of paywalled) {
    const line = sources.split("\n").find((row) => row.includes(url)) || "";
    if (!/lead finder/i.test(line)) problems.push(`paywalled source is not marked as a lead finder: ${hostOf(url)}`);
  }
  if (/(\d{1,2}:\d{2}|\d{1,2}\s*a\.m\.|\d{1,2}\s*p\.m\.)/i.test(parsed.gate) && !/\[\d+/.test(parsed.gate)) {
    problems.push("hours in the trip gate have no citation");
  }
  const latitude = parsed.locator.latitude || "";
  const longitude = parsed.locator.longitude || "";
  const coordinateSource = parsed.locator["coordinate source"] || "";
  const latBlank = blankValue(latitude);
  const lonBlank = blankValue(longitude);
  if (latBlank !== lonBlank) problems.push("coordinates must both be filled or both left blank");
  if (!latBlank && !/agree|two independent/i.test(coordinateSource)) problems.push("coordinates need two independent sources that agree");
  const identity = {
    name: stableName || lead?.name,
    town: parsed.locator.town || lead?.town || "",
    state: lead?.state,
    registerId: normId(parsed.locator["national register reference"]) || lead?.registerId || "",
  };
  const collision = suspectDuplicate(identity, entries);
  if (collision) problems.push(`collision with live or filed ground (${collision.reason}: ${collision.match})`);
  const slug = dossierSlug(lead?.state, stableName || lead?.name);
  if (!slug || slug.endsWith("-")) problems.push("dossier slug is empty");
  if (existingSlugs.has(slug)) problems.push(`duplicate slug ${slug}`);
  return problems;
}

export function entryFromDossier(filename, text) {
  const base = String(filename || "").split("/").pop().replace(/\.md$/, "").replace(/^HT-RES-/, "");
  const coded = base.match(/^([A-Z]{2})-/);
  const parsed = parseWorkerDossier(text);
  const titled = sectionMap(text);
  const locatorBody = titled.get(10)?.body || text;
  const pairs = locatorPairs(locatorBody);
  const register = normId(pairs["national register reference"] || pairs["nrhp"] || "");
  const heading = (text.match(/^#\s+(.+)$/m) || [])[1] || "";
  return {
    state: coded ? coded[1] : "",
    slug: base,
    title: heading.replace(/^HT-RES-[A-Z0-9-]+\s+[—-]\s+/, "").trim() || pairs["stable site name"] || "",
    stableName: pairs["stable site name"] || "",
    town: pairs.town || "",
    registerId: register,
    source: "corpus",
  };
}

export function researchPrompt(lead, checkedDate) {
  const reading = requiresReading(lead);
  return [
    `Research one catalog lead and write one dossier. Checked date: ${checkedDate}.`,
    "Use free sources only: Library of Congress, NPS National Register nominations, National Archives, USGS, state archives, state encyclopedias, SHPO files, university and museum collections, Internet Archive, HathiTrust public domain, and Wikimedia Commons.",
    "A paywalled page is a lead finder only. Follow it to the free record and cite that. If you cite the paywalled page at all, mark that line 'lead finder'.",
    "A claim no free source carries goes in Gaps and conflicts. Do not invent hours, addresses, dates, or coordinates.",
    "Coordinates only when two independent sources agree; otherwise leave Latitude and Longitude blank.",
    "No AI images. Do not embed an image. In Historical photo records say 'No frame adopted.' If you inspected a real photograph, name the collection, credit, and rights, and still adopt nothing.",
    "Hunts are off. Optional observations must include the sentence 'No find is filed.' Do not use the words hunt, score, points, find, or route.",
    reading
      ? "This lead has no lawful public anchor as filed. File it as a research reading. Public anchor must begin 'None — NO-ANCHOR research reading'. Public trip progression must say it is a reading and must not send a visitor to the ground."
      : "If the research does not establish a lawful public anchor, file a reading the same way. Do not turn an unanchored lead into a routed stop.",
    isReflectionLead(lead) ? "This is reflection ground. No find, no route, no scored language." : "",
    /\b(haunt|ghost|legend)\b/i.test(`${lead.anchorPosture || ""} ${lead.name || ""}`)
      ? "Haunted material is lore. Source the telling, label it lore, and keep it apart from the documented record."
      : "",
    "If no free source shows the ground exists, return only a line starting CHECKED-DEAD: and the reason. Do not write a dossier.",
    "Otherwise return only the dossier, in this shape, with no preface:",
    `**Trip gate — Checked ${checkedDate}. <access or reading ruling, with a citation>**`,
    "",
    "## 2. Story",
    `**<stable name>, <town> · Research draft · Machine**`,
    "",
    "<sourced prose, at least a paragraph>",
    "",
    "## 3. Then and now",
    "## 4. Surviving features and access",
    "## 5. Public trip progression",
    "## 6. Gaps and conflicts",
    "## 7. Historical photo records",
    "## 8. Optional observations",
    "## 9. Sources",
    "## 10. Structured locator",
    "- Stable site name:",
    "- Town:",
    "- Public anchor:",
    "- Latitude:",
    "- Longitude:",
    "- Coordinate source:",
    "- National Register reference:",
    "",
    `Lead: ${lead.name}`,
    `Town: ${lead.town || "(not filed)"}`,
    `County: ${lead.county || "(not filed)"}`,
    `State: ${lead.state}`,
    `Register id: ${lead.registerId || "(none)"}`,
    `Anchor posture as filed: ${lead.anchorPosture || "(blank)"}`,
  ].filter(Boolean).join("\n");
}

export function renderReport(report) {
  const lines = [
    "# Machine research run",
    "",
    "These are machine-filed research drafts. They are not published. The desk reviews them. The worker does not merge and does not push to main.",
    "",
    `Items taken: ${report.taken.length}`,
    `Dossiers filed: ${report.filed.length}`,
    `Already in an open run: ${(report.alreadyFiled || []).length}`,
    `Suspected duplicates held out: ${report.duplicates.length}`,
    `Validation failures: ${report.failures.length}`,
    `Checked dead: ${report.checkedDead.length}`,
    "",
  ];
  if (report.alreadyFiled?.length) {
    lines.push("## Already in an open run", "");
    for (const row of report.alreadyFiled) lines.push(`- ${row.id} ${row.name} (${row.state})`);
    lines.push("");
  }
  if (report.duplicates.length) {
    lines.push("## Suspected duplicates", "");
    for (const row of report.duplicates) lines.push(`- ${row.id} ${row.name} (${row.state}) — ${row.reason}: ${row.match}`);
    lines.push("");
  }
  if (report.failures.length) {
    lines.push("## Validation failures", "");
    for (const row of report.failures) lines.push(`- ${row.id} ${row.name}: ${row.problems.join("; ")}`);
    lines.push("");
  }
  if (report.checkedDead.length) {
    lines.push("## Checked dead", "");
    for (const row of report.checkedDead) lines.push(`- ${row.id} ${row.name}: ${row.reason}`);
    lines.push("");
  }
  if (report.filed.length) {
    lines.push("## Filed", "");
    for (const row of report.filed) {
      lines.push(`- lead: ${row.id} path: ${row.path}`);
      lines.push(`  Sources: ${row.sources.length ? row.sources.join(", ") : "(none)"}`);
    }
    lines.push("");
  }
  if (!report.filed.length) lines.push("The run produced nothing. No pull request was opened.", "");
  return lines.join("\n");
}

export function leadIdsInReport(text) {
  return [...String(text || "").matchAll(/^-\s+lead:\s+(lq_[0-9a-f]{16})\b/gm)].map((match) => match[1]);
}

export function groundFromOpenRuns(pulls, readFile) {
  const entries = [];
  const slugs = [];
  const skipIds = [];
  const problems = [];
  for (const pr of pulls || []) {
    const branch = pr.headRefName || "";
    if (!branch.startsWith(RUN_BRANCH_PREFIX)) continue;
    for (const file of pr.files || []) {
      const path = typeof file === "string" ? file : file?.path;
      if (!path) continue;
      const isDossier = path.startsWith("corpus/HT-RES-") && path.endsWith(".md");
      const isReport = /^app\/desk\/machine-runs\/RUN-[^/]+\.md$/.test(path);
      if (!isDossier && !isReport) continue;
      let content = "";
      try {
        content = readFile(path, branch);
      } catch (error) {
        problems.push(`${branch} ${path}: ${error.message}`);
        continue;
      }
      if (isDossier) {
        const entry = entryFromDossier(path, content);
        entries.push(entry);
        if (entry.slug) slugs.push(entry.slug);
      }
      if (isReport) skipIds.push(...leadIdsInReport(content));
    }
  }
  return { entries, slugs, skipIds, problems };
}

function safeError(error, key) {
  let message = String(error?.message || error || "unknown error");
  if (key) message = message.split(String(key)).join("[redacted]");
  return message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

function stripFence(text) {
  const trimmed = String(text || "").trim();
  const fenced = trimmed.match(/^```(?:markdown|md)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

function emptyReport() {
  return { taken: [], duplicates: [], failures: [], filed: [], checkedDead: [], alreadyFiled: [] };
}

export function assertRunBranch(branch) {
  if (branch === "main" || branch === "master" || !String(branch || "").startsWith(RUN_BRANCH_PREFIX)) {
    throw new Error(`refusing to publish on ${branch || "(no branch)"}`);
  }
}

export async function runResearch({
  config,
  key = "",
  queueText,
  entries = [],
  existingSlugs = new Set(),
  now = new Date(),
  complete,
  openPr,
  fileIssue,
  runId = "local",
  skipIds = [],
} = {}) {
  const report = emptyReport();
  const checkedDate = formatCheckedDate(now);
  const catalog = [...entries];
  const slugs = new Set(existingSlugs);
  const held = new Set(skipIds || []);
  if (!String(key || "").trim()) {
    const summary = `No research key is configured. Secret ${config?.secretName === SECRET_NAME ? config.secretName : SECRET_NAME} is unset. Nothing was researched. No pull request was opened.`;
    return { exitCode: 0, openedPr: false, issueFiled: false, summary, report };
  }
  let queue;
  try {
    queue = JSON.parse(queueText);
    const problems = validateResearch(queue);
    if (problems.length) throw new Error(problems.slice(0, 8).join("; "));
  } catch (error) {
    const summary = `The research queue is corrupted. The run stopped. ${error.message}`;
    report.summary = summary;
    if (fileIssue) await fileIssue({ title: "Machine research run stopped: corrupted queue", body: summary });
    return { exitCode: 1, openedPr: false, issueFiled: true, summary, report };
  }
  const cap = config.perRunCap;
  let researched = 0;
  try {
    for (const item of queue.items) {
      if (researched >= cap) break;
      if (!actionable(item)) continue;
      if (held.has(item.id)) {
        report.alreadyFiled.push({ id: item.id, name: item.name, state: item.state });
        continue;
      }
      const duplicate = suspectDuplicate(item, catalog);
      if (duplicate) {
        report.duplicates.push({ id: item.id, name: item.name, state: item.state, ...duplicate });
        continue;
      }
      researched += 1;
      report.taken.push(item.id);
      const raw = await complete({ provider: config.provider, model: config.model, key, prompt: researchPrompt(item, checkedDate) });
      const text = stripFence(raw);
      const dead = text.match(/^CHECKED-DEAD:\s*(.+)$/s);
      if (dead) {
        report.checkedDead.push({ id: item.id, name: item.name, reason: dead[1].trim() });
        continue;
      }
      const problems = validateDossier(text, { lead: item, entries: catalog, existingSlugs: slugs });
      if (problems.length) {
        report.failures.push({ id: item.id, name: item.name, problems });
        continue;
      }
      const parsed = parseWorkerDossier(text);
      const stable = parsed.locator["stable site name"];
      const path = dossierRepoPath(item.state, stable);
      const slug = dossierSlug(item.state, stable);
      slugs.add(slug);
      catalog.push({
        state: item.state,
        title: stable,
        stableName: stable,
        slug,
        town: parsed.locator.town || item.town || "",
        registerId: normId(parsed.locator["national register reference"]) || item.registerId || "",
        source: "this-run",
      });
      report.filed.push({ id: item.id, name: item.name, path, markdown: text, sources: urlsIn(parsed.sections.get(9)?.body || "") });
    }
  } catch (error) {
    const summary = `The research run failed and stopped. ${safeError(error, key)}`;
    const body = `${summary}\n\n${renderReport(report)}`;
    if (fileIssue) await fileIssue({ title: "Machine research run failed", body });
    return { exitCode: 1, openedPr: false, issueFiled: true, summary, report };
  }
  const body = renderReport(report);
  if (!report.filed.length) {
    const summary = "The run produced nothing. No pull request was opened.";
    return { exitCode: 0, openedPr: false, issueFiled: false, summary: `${summary}\n\n${body}`, report };
  }
  const safeId = String(runId || "").replace(/[^A-Za-z0-9._-]/g, "") || "local";
  const branch = `${RUN_BRANCH_PREFIX}${safeId}`;
  assertRunBranch(branch);
  if (openPr) {
    await openPr({
      branch,
      title: `Machine research drafts, run ${runId}`,
      body,
      files: [
        ...report.filed.map((row) => ({ path: row.path, content: `${row.markdown.trim()}\n` })),
        { path: `app/desk/machine-runs/RUN-${runId}.md`, content: body },
      ],
    });
  }
  return { exitCode: 0, openedPr: true, issueFiled: false, summary: body, report, branch };
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function completeWithProvider({ provider, model, key, prompt, fetchImpl = globalThis.fetch }) {
  if (provider !== FREE_PROVIDER || model !== FREE_MODEL) throw new Error("only the approved free research route is allowed");
  const response = await fetchImpl(OPENROUTER_URL, {
    method: "POST",
    redirect: "error",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      provider: { allow_fallbacks: false, max_price: { prompt: 0, completion: 0 } },
      temperature: 0,
      messages: [
        { role: "system", content: "You write one catalog dossier from free sources. You do not publish it. You invent nothing." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!response.ok) throw new Error(`research provider returned ${response.status}`);
  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;
  if (!text) throw new Error("research provider returned no dossier text");
  return text;
}
