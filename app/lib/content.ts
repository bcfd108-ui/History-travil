// Research Desk guide documents.
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

**Access comes first.** Each entry opens with where a visitor may actually stand, what is closed, what is seasonal, and what is archive-only. A historic road or district pin is not a public entrance. Where the record separates where the history happened from where a visitor may stand, the entry keeps that separation.

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
- **Quality control is a separate pass.** Dossiers are drafted, then independently checked against the standard before they publish. A QC pass is not publication, and publication is not activation — a hunt goes active on the owner's word alone, on the strength of the record.`,
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
    blurb: "The product law that governs every hunt, find, and tag in On Old Ground.",
    body: `On Old Ground is a research app with a game. The research reference is the product; the game is a layer on it, never the lead.

**The game is a scavenger hunt, not trivia.** There are no question-and-answer gates and no answer keys. A find names a thing to go and find on the ground — and the tag is the visit itself. A photo is optional everywhere: welcome in your scrapbook, never required.

**You learn and experience.** Learning happens by going and experiencing the place. The research prepares you; the ground does the teaching. Nothing in the game should feel like a test.

**Reflection ground is never part of the game.** No finds, no tags, no scoring on loss ground — ever.

**Activation is the owner's word.** The founding hunts stand activated on the owner's ruling, on the strength of the research record — no field check gates a hunt, and no find is represented as field-verified. A tag is witnessed by the player's own presence, and by their photo or position only when they choose to give them. Candidate finds shown on entries in this edition are labelled exactly that: from the research record, candidates until the owner activates them.`,
  },
];

// The hunt list itself — the three founding hunts and their find lists,
// recovered verbatim from the original app's record — lives in
// data/hunts.json behind lib/data.ts (getHunts), the same sidecar pattern
// as the tours. Hunt pages render from that data; nothing about the hunts
// is kept here any more.
