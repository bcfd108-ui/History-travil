// Research Desk guide documents and the hunt list.
// The guide texts are written from the project's own governing documents —
// the publish manifest's fidelity rules, the product law (Update 252), and
// the QC compiled summary — and say so on their face. The full text of the
// app's original Desk documents lives only in the Muse app record; these
// guides are this edition's Desk until that text migrates (see ARCHITECTURE.md).

export interface DeskDoc {
  slug: string;
  title: string;
  blurb: string;
  body: string;
}

export const DESK_GUIDES: DeskDoc[] = [
  {
    slug: "how-to-read-an-entry",
    title: "How to read an entry",
    blurb: "The locator record, why blank fields stay blank, and why a pin is not an entrance.",
    body: `Every entry in this catalog was converted from a research dossier — a document built from primary and near-primary sources, with its disagreements printed rather than smoothed over.

**Access comes first.** Each entry opens with its trip gate: where a visitor may actually stand, what is closed, what is seasonal, what is archive-only. A historic road or district pin is not a public entrance. Where the record separates where the history happened from where a visitor may stand, the entry keeps that separation.

**The locator record is fixed-field.** Register numbers (NRHP, HMdb, ARK, archive IDs) and coordinates appear only where the dossier's cited source prints them. A blank field is blank in the record — nothing is invented to fill it. Most dossiers deliberately leave coordinates blank; a missing coordinate is the standard working, not a defect.

**Every entry is labelled published research** — the record, with its gaps printed — so a reader can tell a desk-published entry from a field-proven one. The honest-gaps section of each entry names what the research could not establish.`,
  },
  {
    slug: "the-research-standard",
    title: "The research standard",
    blurb: "Primary sources, printed disagreements, and quality control — how a dossier earns its place.",
    body: `The standard for every dossier in this catalog:

- **Load-bearing claims are sourced** to primary or near-primary sources — the people's own words, operator and agency records, register nominations, archive catalogues — and attributed.
- **Disagreements are printed, not smoothed.** When sources conflict on a date, a count, or an hour, the entry carries the conflict and says which way to plan.
- **Locators are never invented.** Across 311 dossiers checked in the November 2026 QC run, zero invented register numbers were found; every filled identifier traced to a cited source.
- **Access is stated honestly.** Closures, seasonal gates, museum-only and archive-only status ride on top of the entry, prominently.
- **Quality control is a separate pass.** Dossiers are drafted, then independently checked against the standard before they publish. A QC pass is not publication, and publication is not activation — turning an entry into a scored hunt still takes a human field check and the owner's word.`,
  },
  {
    slug: "stop-types",
    title: "Stop types",
    blurb: "Visit, reflection, read remotely, check access — what each kind of stop asks of you.",
    body: `Entries carry one of a small set of stop types:

**View stop (visit).** Ground you can go to and read in person — a museum, a marker, a public viewpoint named in the entry's own record. Unscored in the reference; part of a hunt only where a hunt names it.

**Reflection stop.** Ground whose story is a loss — burial ground, massacre and confinement sites, drowned places, communities displaced. Reflection stops are read and witnessed, never gamed: no finds, no tags, no points, no check-in path. The game goes quiet there by design.

**Read from home.** Research, trip planning, and deep study of a place all run at full depth from home — nothing in the reference is gated behind being there. Every catalog entry is tied to ground a reader can go to; archives appear in entries as sources, never as the destination. A subject with no visitable ground belongs to this Desk as reading, not to the catalog as a stop.

**Check access.** Where the record could not confirm that a place is open, or where admission runs through a specific authority, the entry says so up front. Confirm before you go; do not treat a listing as permission.`,
  },
  {
    slug: "the-game-law",
    title: "The game: a scavenger hunt, not a test",
    blurb: "The product law that governs every hunt, find, and tag in History Travel.",
    body: `History Travel is a research app with a game. The research reference is the product; the game is a layer on it, never the lead.

**The game is a scavenger hunt, not trivia.** There are no question-and-answer gates and no answer keys. A find names a thing to go and find on the ground — and to get the tag, you gotta take the picture. The photo is the tag.

**You learn and experience.** Learning happens by going and experiencing the place. The research prepares you; the ground does the teaching. Nothing in the game should feel like a test.

**Reflection ground is never part of the game.** No finds, no tags, no scoring on loss ground — ever.

**Activation is earned, not automatic.** A candidate find in a research dossier is a draft until a human has stood on the ground, checked it, and the owner has given the word. Candidate finds shown on entries in this edition are labelled exactly that: from the research record, not yet field-checked or activated.`,
  },
];

export interface Hunt {
  slug: string;
  name: string;
  ground: string;
  findsInApp: number;
  about: string;
  related: { slug: string; label: string }[];
}

// The three hunts as built in the current app (13 finds total). Their find
// lists live in the app record; this edition presents the hunts with the
// research record behind them, and candidate finds on individual entries
// can be photo-tagged into a visitor's scrapbook (Stage 2).
export const HUNTS: Hunt[] = [
  {
    slug: "pulaski-hunt",
    name: "The Pulaski Hunt",
    ground: "Wallace, Idaho — the Pulaski Trail and the 1910 Big Burn country",
    findsInApp: 5,
    about:
      "Five photo finds in the country Ed Pulaski walked his crew out of in August 1910 — the tunnel, the trail, the town that rebuilt in brick. The research record behind it is the firefighter-innovation packet: Pulaski's tool, the Nicholson adit, and the words of the men who were there.",
    related: [
      { slug: "st-joe-st-maries", label: "The St. Joe and the fire that filled a cemetery" },
      { slug: "ID-lochsa-ranger-station", label: "Lochsa Ranger Station" },
    ],
  },
  {
    slug: "valley-hunt",
    name: "The Valley Hunt",
    ground: "Lewiston, Idaho — the Lewis-Clark Valley home ground",
    findsInApp: 4,
    about:
      "Four photo finds across Lewiston's own record: the locomotive park, the 1909 depot, Main Street's district, Normal Hill, and the confluence of the Snake and Clearwater — where the hunt goes quiet at the Nez Perce beat, because that ground is reflection, not a game.",
    related: [
      { slug: "lewiston-locomotive-park", label: "Locomotive Park / Engine 92" },
      { slug: "lewiston-depot", label: "Lewiston Depot" },
      { slug: "lewiston-main-street", label: "Historic Main Street" },
      { slug: "lewiston-normal-hill", label: "Normal Hill" },
      { slug: "lewiston-confluence", label: "Snake–Clearwater Confluence" },
    ],
  },
  {
    slug: "mining-country-hunt",
    name: "The Mining Country Hunt",
    ground: "Idaho's silver and gold country — Murray, Bayhorse, Kellogg, the Yankee Fork",
    findsInApp: 4,
    about:
      "Four photo finds in the mining country dossiers: the Coeur d'Alene silver ground, Bayhorse's charcoal-kiln townsite, the Bunker Hill labour record, and the Yankee Fork's dredge country. Several of these entries carry live gates — Wardner is held, the Staff House Museum is closed until Memorial Day weekend 2027, and Bayhorse stays out of routing until Idaho Parks publishes a reopening — and the hunt respects every one of them.",
    related: [
      { slug: "murray", label: "Murray" },
      { slug: "bayhorse", label: "Bayhorse" },
      { slug: "bunker-hill-kellogg", label: "Bunker Hill / Kellogg" },
      { slug: "custer-yankee-fork", label: "Custer / Yankee Fork" },
      { slug: "cataldo-mission", label: "Cataldo Mission" },
    ],
  },
];
