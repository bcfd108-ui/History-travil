import { EntryNavigation, MoreGround } from "./EntryNavigation";
import { catalog, pathName, themeUrl, type Query } from "@/lib/browse";
import Link from "next/link";
import {
  getConnectedSites,
  type HistoricPhoto,
  getHuntFindsForSite,
  getPlainTop,
  getPublicLocator,
  getPublicTitle,
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

function PhotoFigure({ photo }: { photo: HistoricPhoto }) {
  return (
    <figure className="historic-photo" data-photo-source={photo.sourceUrl} data-assignment={photo.rowId}>
      <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" />
      <figcaption>
        <span className="hp-caption">{photo.caption}</span>
        <span className="hp-credit">
          {photo.eraRole === "then" ? "Then" : "Now"} · {photo.dateNote || photo.year || ""}{(photo.dateNote || photo.year) && " · "}
          <span data-photo-credit>
            {photo.modificationNote ? <a href={photo.sourceUrl}>{photo.credit}</a> : photo.credit}
          </span> · <a href={photo.licenseUrl}>{photo.license}</a>
          {photo.modificationNote && <>{" · "}{photo.modificationNote}</>}
          {" · "}<a href={photo.sourceUrl}>{photo.sourceName}</a>
        </span>
      </figcaption>
    </figure>
  );
}

function LocatorCard({ site }: { site: Site }) {
  const { operator, access, listing, registerUrl, point } = getPublicLocator(site.slug);
  if (!operator && !access && !listing && !point) return null;
  return (
    <section className="panel" aria-label="Locator record">
      <h2>Locator record</h2>
      <dl className="locator-grid">
        {operator && <div><dt>Operator</dt><dd>{operator}</dd></div>}
        {access && <div><dt>Public entrance / access</dt><dd>{access}</dd></div>}
        {listing && (
          <div>
            <dt>NRHP / National Register</dt>
            <dd>{registerUrl ? <a href={registerUrl} target="_blank" rel="noreferrer">{listing}</a> : listing}</dd>
          </div>
        )}
        {point && <div><dt>Coordinates</dt><dd>{point.lat}, {point.lon}</dd></div>}
      </dl>
      {point && (
        <p className="small">
          <a
            href={`https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lon}#map=15/${point.lat}/${point.lon}`}
            target="_blank"
            rel="noreferrer"
          >
            See the recorded point on OpenStreetMap
          </a>{" "}
          — the point as printed in the dossier&apos;s locator record. A pin is not a public
          entrance; the Before you go section above says where you may stand.
        </p>
      )}
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
        directions. A historic pin is not a public entrance; the visitable anchor and the Before
        you go section govern where you may stand.
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
  const publicTitle = getPublicTitle(slug);
  const themes = catalog().find(r=>r.slug === slug)!.themes;
  const isReflection = site.stopType === "reflection";
  const isFlight93 = slug === "PA-flight-93-national-memorial-reflection";
  const anchor = getVisitableAnchor(site);
  // Editors opt an individual public place into field checks. A historic point or
  // an inferred anchor alone never issues an invitation.
  const publicStop = anchor?.basis === "Public anchor";
  const accessPrompt = publicStop ? site.locator.extra.find((field) => field.key === "Visitor access check")?.value : undefined;
  const photoSubject = publicStop && site.photoEligibility === "PUBLIC GROUND" ? site.locator.extra.find((field) => field.key === "Visitor photo subject")?.value : undefined;
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
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(entryJsonLd(site)) }}
      />
      <EntryNavigation slug={slug} context={context}/>
      <h1>{publicTitle.name}</h1>
      {publicTitle.dek && <p className="lede entry-dek">{publicTitle.dek}</p>}
      <p>
        {site.town ? `${site.town}, ` : ""}{site.state}
        {" · "}
        <span className={`badge${isReflection ? " reflection" : ""}`}>
          {isReflection ? "Reflection stop" : site.stopType === "hunt" ? "Hunt stop" : "View stop"}
        </span>
        {anchor && <span className="badge amber">{anchor.approach}</span>}
        <span className="badge">Published research</span>
        {themes.map((t) => (
          <a key={t} className="theme-tag" href={themeUrl(t)}>{pathName(t)}</a>
        ))}
      </p>
      {plainTop && (
        <>
          {plainTop.sections.map((sec) => (
            <section key={sec.heading}>
              <h2>{sec.heading}</h2>
              {sec.paragraphs?.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {sec.bullets && (
                <ul>
                  {sec.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <section>
            <h2>The full record</h2>
            <p>
              Everything below is the complete research record for this place — the story in
              full, what stands there now, the gaps we print on purpose, and the sources. Read
              as much or as little as you want; the plain version above is enough to go.
            </p>
          </section>
        </>
      )}
      {site.standfirst && <Md text={site.standfirst} />}
      {site.lead && <Md text={site.lead} />}

      {[...site.photos].sort((a, b) => (a.year ?? Infinity) - (b.year ?? Infinity)).map(photo => (
        <PhotoFigure key={photo.sourceUrl} photo={photo} />
      ))}
      <MapSheetFigures entryKey={site.slug} />

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
            <strong>This is reflection ground.</strong> Read and witness.
            {!isFlight93 && " There are no finds, no tags, and no scoring here."}
          </p>
        )}
      </section>

      {accessPrompt && <VisitorUpdate slug={slug} prompt={accessPrompt} photoSubject={photoSubject} />}

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

      {site.story && (
        <section>
          <h2>The story</h2>
          <Md text={site.story} />
        </section>
      )}
      {site.thenNow && (
        <section>
          <h2>Then / now</h2>
          <Md text={site.thenNow} />
        </section>
      )}
      {!accessPrompt && thenNowInvitation(site) && <CompleteThePair slug={site.slug} />}
      {site.stillThere && (
        <section>
          <h2>What&apos;s still there</h2>
          <Md text={site.stillThere} />
        </section>
      )}
      {site.progression && (
        <section>
          <h2>The stop, step by step</h2>
          <Md text={site.progression} />
        </section>
      )}
      {site.moreSections.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          <Md text={isFlight93 && s.title === "Reflection"
            ? s.body.replace(/^\*\*Reflection stop only\. No hunts, scoring, answer keys, hidden targets or reenactments\.\*\*\s*/, "")
            : s.body} />
        </section>
      ))}

      <ConnectionsPanel site={site} />
      <MoreGround slug={slug}/>

      <HistoricLocation site={site} />
      <LocatorCard site={site} />

      {site.gaps && (
        <section>
          <h2>Honest gaps &amp; disagreements</h2>
          <Md text={site.gaps} />
        </section>
      )}

      <SiteActions slug={site.slug} title={site.title} publicVisit={publicStop && !isReflection && !accessPrompt} />

      {site.photoRecord && (
        <details className="sources">
          <summary>Photo record (from the dossier)</summary>
          <Md text={slug === "PA-centralia"
            ? site.photoRecord.replace(/^- Rights\/license line, verbatim from the file page[^\n]*$/m,
                "- Published license: [Free Art License 1.3](https://artlibre.org/licence/lal/en/). See the photograph credit above for the author, original and WebP conversion.")
            : site.photoRecord} />
        </details>
      )}
      {site.sources && (
        <details className="sources">
          <summary>Records &amp; sources</summary>
          <Md text={site.sources} />
        </details>
      )}
      {site.publishedAs && <p className="small">{site.publishedAs}</p>}
    </article>
  );
}
