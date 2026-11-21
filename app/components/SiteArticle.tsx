import EntryPhotos from "./EntryPhotos";
import { FullRecord, PlainOpening, VisitTable } from "./EntryRecord";
import { EntryNavigation, MoreGround } from "./EntryNavigation";
import { catalog, pathName, themeUrl, type Query } from "@/lib/browse";
import Link from "next/link";
import {
  getConnectedSites,
  getHistoricPhoto,
  getHuntFindsForSite,
  getPlainTop,
  getVisitFacts,
  getToursForSite,
  getVisitableAnchor,
  historicLocationFields,
  thenNowInvitation,
  type Site,
} from "@/lib/data";
import { Md } from "@/lib/md";
import { entryJsonLd } from "@/lib/seo";
import VisitorUpdate from "@/components/VisitorUpdate";
import SiteActions from "@/components/SiteActions";
import ClaimFind from "@/components/ClaimFind";
import CompleteThePair from "@/components/CompleteThePair";
import MapSheetFigures from "@/components/MapSheetFigure";

function LocatorCard({ site }: { site: Site }) {
  const L = site.locator;
  const fields: [string, string][] = [
    ["Stable name", L.stableName],
    ["Printed address", L.address],
    ["Operator", L.operator],
    ["NRHP / National Register", L.nrhp],
    ["HMdb", L.hmdb],
    ["ARK", L.ark],
    ["Archive ID", L.archiveId],
    ["Register URL", L.registerUrl],
    ["Coordinates", site.coordinates ? `${site.coordinates.lat}, ${site.coordinates.lon}` : ""],
    ["Coordinate source", L.coordinateSource || site.coordinateKind],
    ...L.extra.map((e) => [e.key, e.value] as [string, string]),
  ];
  return (
    <section className="panel" aria-label="Locator record">
      <h2>Locator record</h2>
      <dl className="locator-grid">
        {fields.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>
              {v ? (
                k === "Register URL" && /^https?:/.test(v) ? (
                  <a href={v} target="_blank" rel="noreferrer">{v}</a>
                ) : (
                  v
                )
              ) : (
                <span className="blank">— blank in the record</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {site.coordinates && (
        <p className="small">
          <a
            href={`https://www.openstreetmap.org/?mlat=${site.coordinates.lat}&mlon=${site.coordinates.lon}#map=15/${site.coordinates.lat}/${site.coordinates.lon}`}
            target="_blank"
            rel="noreferrer"
          >
            See the recorded point on OpenStreetMap
          </a>{" "}
          — the point as printed in the dossier&apos;s locator record. A pin is not a public
          entrance; the access record identifies the public ground.
        </p>
      )}
      <p className="small">
        Blank fields are blank in the source dossier. Nothing is invented to fill them.
      </p>
    </section>
  );
}

// Connected ground (owner's direction, Nov 20, 2026): the routes this entry
// is a stop on, and the other entries the record itself ties to this one —
// same route, a corridor or river named in both records, or the same town.
// Connections are derived in lib/data.ts from the records only; where none
// exist, the panel does not render.
function ConnectionsPanel({ site }: { site: Site }) {
  const tours = getToursForSite(site.slug);
  const connected = getConnectedSites(site);
  if (tours.length === 0 && connected.length === 0) return null;
  return (
    <section className="panel" aria-label="Connected ground">
      <h2>Connected ground</h2>
      {tours.length > 0 && (
        <>
          <p className="small">On this route:</p>
          <div className="rows">
            {tours.map((t) => (
              <Link key={t.id} className="row" href={`/tours/${t.id}`}>
                <span className="t">{t.name}</span>
                <span className="small">{t.meta}</span>
              </Link>
            ))}
          </div>
        </>
      )}
      {connected.length > 0 && (
        <div className="rows">
          {connected.map(({ site: other, connection }) => (
            <Link key={other.slug} className="row" href={`/sites/${other.slug}`}>
              <span className="t">{other.title}</span>
              <span className="small">
                {other.town ? `${other.town}, ` : ""}
                {other.state}
                {other.stopType === "reflection" ? " · Reflection stop" : ""}
              </span>
              <span>{connection}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

// The visitable anchor: the ground a reader can actually go to, as the
// dossier's locator record names it (derivation in lib/data.ts). Where no
// anchor is derivable the panel says so plainly — the entry is carried, not
// dropped, and no anchor is invented for it.
function AnchorPanel({ site }: { site: Site }) {
  const anchor = getVisitableAnchor(site);
  if (!anchor) {
    return (
      <section className="panel" aria-label="Visitable anchor">
        <h2>Where you go</h2>
        <p>
          This entry&apos;s dossier names <strong>no visitable public anchor</strong> — no
          lawful public ground a reader can be sent to is established in its locator record.
          The entry is carried as research reading, with its sources below, and is flagged for
          the owner&apos;s ruling on whether it belongs in the Research Desk instead of the
          travel catalog. Nothing has been invented to fill the gap.
        </p>
      </section>
    );
  }
  return (
    <section className="panel" aria-label="Visitable anchor">
      <h2>Where you go</h2>
      <p>
        <strong>{anchor.name}</strong>{" "}
        <span className="badge amber">{anchor.approach}</span>
      </p>
      {anchor.boundary && (
        <p>
          <strong>The boundary:</strong> {anchor.boundary}
        </p>
      )}
      <p className="small">
        The visitable anchor as named in the dossier&apos;s locator record ({anchor.basis}).
        The Before you go section below says where you may stand — a historic pin is not a public
        entrance.
      </p>
    </section>
  );
}

// Where it was: the historic location as information. The record's own
// historic-location fields, printed as text — never as a map point, never
// as directions, never as a visit offer. Where the dossier deliberately
// omits the point, its words say so and are carried as-is.
function HistoricLocation({ site }: { site: Site }) {
  const fields = historicLocationFields(site);
  if (fields.length === 0) return null;
  return (
    <section className="panel" aria-label="Where it was — the historic location">
      <h2>Where it was</h2>
      <p className="small">
        The historic location as the record gives it — information, not an entrance and not
        directions. A historic pin is not a public entrance; the access record identifies the public ground.
      </p>
      <dl className="locator-grid">
        {fields.map((f) => (
          <div key={f.key}>
            <dt>{f.key}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function SiteArticle({ site, context }: { site: Site; context?: Query }) {
  const {slug} = site;
  const row = catalog().find(r => r.slug === slug)!;
  const facts = getVisitFacts(site);
  const leadPhoto = getHistoricPhoto(slug);
  const reading = !!facts?.reading;
  const isReflection = site.stopType === "reflection";
  const anchor = reading ? null : getVisitableAnchor(site);
  // Editors opt an individual public place into field checks. A historic point or
  // an inferred anchor alone never issues an invitation.
  const publicStop = anchor?.basis === "Public anchor";
  const accessPrompt = publicStop ? site.locator.extra.find((field) => field.key === "Visitor access check")?.value : undefined;
  const photoSubject = publicStop ? site.locator.extra.find((field) => field.key === "Visitor photo subject")?.value : undefined;
  const plainTop = getPlainTop(site.slug);
  // Hunt finds tied to this entry join its own candidate finds in the tag
  // panel — same ClaimFind mechanic, the claim recording the find's label
  // exactly as the hunt names it (hunt progress derives from those claims).
  // getHuntFindsForSite returns none for reflection entries, and the panel
  // never renders on reflection ground.
  const huntFinds = isReflection ? [] : getHuntFindsForSite(site.slug);
  const panelFinds = [
    ...site.candidateFinds,
    ...huntFinds.map((hf) => hf.find.label).filter((l) => !site.candidateFinds.includes(l)),
  ];
  const showFinds = !isReflection && !!anchor && panelFinds.length > 0;

  return (
    <article className="place-entry">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(entryJsonLd(site)) }}
      />
      <header className="entry-header">
        <h1>{row.title}</h1>
        {facts?.warning && <div role="note" className="entry-warning">{facts.warning.value}</div>}
        <div className="entry-meta">
          <span>{[site.town, site.state].filter(Boolean).join(", ")}</span>
          <span className={`badge${isReflection ? " reflection" : ""}`}>
            {reading ? "Reading entry" : isReflection ? "Reflection stop" : site.stopType === "hunt" ? "Hunt stop" : "View stop"}
          </span>
          {reading && isReflection && <span className="badge reflection">Reflection</span>}
          {row.themes.map(t => <a key={t} className="theme-tag" href={themeUrl(t)}>{pathName(t)}</a>)}
        </div>
      </header>
      <EntryPhotos lead={leadPhoto} />
      {facts && plainTop ? <PlainOpening top={plainTop} /> : <>
        {/* Keep the original access gate until this entry has a reviewed replacement. */}
        <AnchorPanel site={site} />

        <section className="access-card" aria-label="Before you go">
          <h2>Before you go</h2>
          {site.access ? (
            <Md text={site.access} />
          ) : (
            <p>
              This dossier carries no separate Before you go section. Its access guidance is in the
              story and the honest-gaps section below — read both before going, and confirm
              current access with the operator.
            </p>
          )}
          {isReflection && (
            <p>
              <strong>This is reflection ground.</strong> Read and witness. There are no finds,
              no tags, and no scoring here.
            </p>
          )}
        </section>
      </>}
      <FullRecord site={site} voices={facts ? (facts.voices || []) : undefined} />
      <MapSheetFigures entryKey={slug} />

      <ConnectionsPanel site={site} />
      <MoreGround slug={slug} />
      <EntryNavigation slug={slug} context={context} />
      {showFinds && (
        <section className="panel" aria-label="Candidate photo finds">
          <h2>Candidate photo finds</h2>
          <p className="small">
            From the research record — <strong>not yet field-checked or activated</strong>. A
            find is claimed by going to the ground and being there; a photo is optional, yours to add if you want it.
          </p>
          <ul>
            {site.candidateFinds.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
            {huntFinds.map((hf) => (
              <li key={`hunt-${hf.hunt.slug}-${hf.find.n}`}>
                {hf.find.label} —{" "}
                {hf.hunt.status === "active" ? "a find of the active hunt " : "a candidate find of "}
                <Link href={`/hunts/${hf.hunt.slug}`}>{hf.hunt.name}</Link>
              </li>
            ))}
          </ul>
          <h3>Tag a find</h3>
          <p className="small">
            Stood on this ground and found one? Tag it — and add a photo if you like. The claim is your own
            scrapbook record — it does not activate the find, and nothing is scored.
          </p>
          <ClaimFind slug={site.slug} finds={panelFinds} />
        </section>
      )}

      {accessPrompt && <VisitorUpdate slug={slug} prompt={accessPrompt} photoSubject={photoSubject} />}
      {!reading && !accessPrompt && !leadPhoto?.pair && thenNowInvitation(site) && <CompleteThePair slug={slug} />}
      <SiteActions slug={slug} title={site.title} publicVisit={publicStop && !isReflection && !accessPrompt} />

      {facts && <VisitTable facts={facts} />}
      {site.gaps && <details className="sources">
        <summary>Honest gaps &amp; disagreements</summary>
        <Md text={site.gaps} />
      </details>}
      {(site.photoRecord || leadPhoto) && <details className="sources">
        <summary>Photo record</summary>
        {site.photoRecord ? <Md text={site.photoRecord} /> : leadPhoto && <p>
          {leadPhoto.credit} · <a href={leadPhoto.sourceUrl}>{leadPhoto.sourceName}</a>
        </p>}
      </details>}
      <details className="sources">
        <summary>Records &amp; sources</summary>
        <Md text={site.sources} />
        <details className="sources"><summary>Locator and original access record</summary>
          <HistoricLocation site={site} />
          <LocatorCard site={site} />
          {facts && <Md text={site.access} />}
          {plainTop?.sections.filter(s => s.heading === "Before you go").map(s =>
            <ul key={s.heading}>{s.bullets?.map(b => <li key={b}>{b}</li>)}</ul>)}
        </details>
        {site.publishedAs && <p className="small">{site.publishedAs}</p>}
      </details>
    </article>
  );
}
