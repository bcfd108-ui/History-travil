import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getHistoricPhoto,
  getPlainTop,
  getSite,
  getSites,
  getVisitableAnchor,
  historicLocationFields,
  thenNowInvitation,
  type Site,
} from "@/lib/data";
import { Md } from "@/lib/md";
import { entryDescription, entryJsonLd, entryUrl } from "@/lib/seo";
import SiteActions from "@/components/SiteActions";
import ClaimFind from "@/components/ClaimFind";
import CompleteThePair from "@/components/CompleteThePair";

export const dynamicParams = false;

export function generateStaticParams() {
  return getSites().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = getSite(slug);
  if (!site) return { title: "History Travel" };
  const title = `${site.title} — History Travel`;
  const description = entryDescription(site);
  return {
    title,
    description,
    alternates: { canonical: `/sites/${site.slug}` },
    openGraph: {
      type: "article",
      siteName: "History Travel",
      title,
      description,
      url: entryUrl(site),
    },
    twitter: { card: "summary", title, description },
  };
}

// The entry's historical photograph, where one has been honestly sourced
// (owner's ruling, Nov 19, 2026). Renders nothing when the record has none —
// the gap stays in the entry's photo record rather than being filled.
function HistoricPhotoFigure({ slug }: { slug: string }) {
  const photo = getHistoricPhoto(slug);
  if (!photo) return null;
  return (
    <figure className="historic-photo">
      <img src={photo.src} alt={photo.alt} loading="lazy" />
      <figcaption>
        <span className="hp-caption">{photo.caption}</span>
        {photo.representative && (
          <span className="badge amber">Representative view — not the site itself</span>
        )}
        <span className="hp-credit">
          {photo.credit} ·{" "}
          <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
            {photo.sourceName}
          </a>
        </span>
        {photo.dateNote && <span className="hp-note">{photo.dateNote}</span>}
      </figcaption>
    </figure>
  );
}

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
          entrance; the Before you go section above says where you may stand.
        </p>
      )}
      <p className="small">
        Blank fields are blank in the source dossier. Nothing is invented to fill them.
      </p>
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

export default async function SitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = getSite(slug);
  if (!site) notFound();
  const isReflection = site.stopType === "reflection";
  const anchor = getVisitableAnchor(site);
  const plainTop = getPlainTop(site.slug);
  const showFinds = !isReflection && !!anchor && site.candidateFinds.length > 0;

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(entryJsonLd(site)) }}
      />
      <p className="small"><Link href="/catalog">← Catalog</Link></p>
      <h1>{site.title}</h1>
      <p>
        {site.town ? `${site.town}, ` : ""}{site.state}
        {" · "}
        <span className={`badge${isReflection ? " reflection" : ""}`}>
          {isReflection ? "Reflection stop" : "View stop"}
        </span>
        {anchor && <span className="badge amber">{anchor.approach}</span>}
        <span className="badge">Published research</span>
        {site.themes.map((t) => (
          <span key={t} className="badge">{t}</span>
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

      <HistoricPhotoFigure slug={site.slug} />

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
          </ul>
          <h3>Tag a find</h3>
          <p className="small">
            Stood on this ground and found one? Tag it — and add a photo if you like. The claim is your own
            scrapbook record — it does not activate the find, and nothing is scored.
          </p>
          <ClaimFind slug={site.slug} finds={site.candidateFinds} />
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
      {thenNowInvitation(site) && <CompleteThePair slug={site.slug} />}
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
          <Md text={s.body} />
        </section>
      ))}

      <HistoricLocation site={site} />
      <LocatorCard site={site} />

      {site.gaps && (
        <section>
          <h2>Honest gaps &amp; disagreements</h2>
          <Md text={site.gaps} />
        </section>
      )}

      <SiteActions slug={site.slug} title={site.title} />

      {site.photoRecord && (
        <details className="sources">
          <summary>Photo record (from the dossier)</summary>
          <Md text={site.photoRecord} />
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
