// Presentation only: no title here changes a dossier, stable ID, route or access.
const INTERNAL = /\bHT[\s_‐‑–-]+RES\b/i;
const PREFIX = /^HT[\s_-]+RES(?:-[\w-]+)?(?:\s*[—–:]\s*|$)/i;
const SOUND_HEADING = /\p{L}/u;
const STORY_OPEN = /^(?:a |an |how |why |what |when |where |who |learning |remembering |finding |reading |waiting |making |claiming |keeping |standing |surviving |moving |the (?:work|day|people|words|names|document|burying|burial|chance|story|family|machine|record|history|childhood|delta childhood|civilian conservation corps crews|freight depot|cleveland museum|grant gallery|rectory|waveland school|house that|house amzie|1910 firefighters' monument|battle of tupelo)\b)/i;

// Desk-approved exact names in Item 3: the subject (not a substitute visit)
// in Poston/Amache/Bisbee, Bayhorse's exact trip-gate name, and the museum
// as documented in the Walnut Ridge heading and public-venue record.
const PRIORITY = {
  "AZ-poston-reflection": "Poston",
  "CO-amache-reflection": "Amache",
  bayhorse: "Bayhorse Ghost Town",
  "AZ-bisbee-deportation-reflection": "Bisbee Deportation",
  "AR-walnut-ridge-rail-and-airfield-workers": "Wings of Honor Museum",
};

// In the cases below an exact name in this entry's own story/locator is
// more specific than a town heading, or an unrelated reading room would
// otherwise be mistaken for the subject. These are not visitor directions.
const EXACT_LEADS = {
  "NY-camp-santanoni": "Camp Santanoni", // DEC historic area and NRIS 86002955; not the trailhead
  "CO-denver-chicano-education": "Denver Chicano education", // stable subject clause
  "CO-denver-disability-rights-history": "Denver disability rights", // stable subject clause
  "CO-denver-japantown-community": "Denver Japanese community", // stable subject clause
  "ID-priest-river": "Priest River Experimental Forest", // trip gate and locator
  "KS-hoxie-courthouse-county-work": "Sheridan County Courthouse", // trip gate and locator
  "MS-lyceum-circle": "Lyceum–The Circle Historic District", // stable name, no access claim
  "NV-tahoe-washoe-stewardship": "Tahoe", // named homeland in the published account
  "NV-virginia-city-nevada-chinese-community": "Virginia City, Nevada", // source title, not the reading venue
  "SD-de-smet-surveyors-house": "De Smet Surveyors’ House", // verbatim heading lead
  "UT-uintah-basin-ute-public-history": "Ute Indian Tribe", // named throughout the source
  "WY-laramie-black-fourteen": "Black 14", // named exhibition and participant source
  "WY-rock-springs-chinese-massacre": "Chinese Massacre of 1885", // city's printed source title
};

// Exact geographic scope only where a separately verified research venue
// is not the historical subject and a more specific name would overclaim.
const SCOPE_LEADS = {
  "CO-boulder-queer-community-history": "Boulder",
  "UT-salt-lake-black-community": "Salt Lake City",
  "UT-utah-greek-community-labor": "Utah",
};

function clean(value = "") {
  return value.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}
function fold(value) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
function startsWithName(value, name) {
  const a = fold(value), b = fold(name);
  return b.length > 1 && (a === b || a.startsWith(b + " "));
}
function usable(value) {
  return value && !INTERNAL.test(value) && SOUND_HEADING.test(value) &&
    !/^(?:blank|unverified|unknown|none|hold|n\/a|archive only|not recorded)\b/i.test(value);
}
function asStable(value) {
  const raw = clean(value);
  // Delimited scope notes aren't part of the proper noun. Commas and
  // slash-spelled alternate names stay; they may be part of the record.
  const result = raw.split(/\s+[—–]\s+|;\s+/u)[0].replace(/(?:\s*\[[\d,–-]+\])+\s*\.?$/u, "").replace(/\.$/, "").trim();
  return usable(result) ? result : "";
}

/** Some source locators print'- **Stable site name** Name' without a colon.
 * Read that exact field for display, without changing canonical parsing. */
export function recordedTitleName(body = "") {
  for (const line of body.split("\n")) {
    const m = line.match(/^\s*(?:[-*]\s+)?\*\*Stable (?:site |entry |resource )?name\s*:?\*\*\s*:?\s+(.+)$/i);
    if (m) return clean(m[1]);
  }
  return "";
}

export function entryDisplayTitle({ slug, raw, hasHeading, stableName = "", town = "" }) {
  const source = hasHeading ? clean(raw) : "";
  const sourceHasId = INTERNAL.test(source);
  const heading = source.replace(PREFIX, "").trim();
  const stable = asStable(stableName);
  const locality = usable(clean(town)) ? clean(town) : "";
  const sep = heading.match(/\s+[—–]\s+|:\s+|\s+and\s+(?=the (?:work|people|rooms)\b)/iu);
  const first = sep ? heading.slice(0, sep.index).trim() : heading;
  const rest = sep ? heading.slice(sep.index + sep[0].length).trim() : "";
  const headingSupported = startsWithName(first, locality) || startsWithName(first, stable) || startsWithName(stable, first);
  const readsAsStory = STORY_OPEN.test(first) && !headingSupported;
  const retireIdHead = sourceHasId && !headingSupported && Boolean(stable);
  const headingName = usable(first) && !readsAsStory && !retireIdHead && !INTERNAL.test(heading) ? first : "";
  const priority = Object.hasOwn(PRIORITY, slug) ? PRIORITY[slug] : "";
  let name, dek = "", basis;
  if (priority) {
    name = priority;
    basis = "desk priority";
    dek = headingName ? rest : heading;
  } else if (Object.hasOwn(EXACT_LEADS, slug) || Object.hasOwn(SCOPE_LEADS, slug)) {
    const exact = Object.hasOwn(EXACT_LEADS, slug);
    name = (exact ? EXACT_LEADS : SCOPE_LEADS)[slug];
    basis = exact ? "documented subject" : "recorded locality only";
    dek = headingName ? rest : heading;
  } else if (headingName) {
    name = headingName;
    basis = "source heading";
    dek = rest;
  } else if (stable) {
    name = stable;
    basis = "stable record";
    dek = heading;
  } else if (locality) {
    name = locality;
    basis = "recorded locality only";
    dek = heading;
  } else {
    name = "Catalog entry";
    basis = "hold: no verified name";
    dek = heading;
  }
  if (!usable(dek) || fold(dek) === fold(name)) dek = "";
  return { name, dek, basis };
}
