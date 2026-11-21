import Link from "next/link";
import { notFound } from "next/navigation";
import { getSite, getTour, getTours } from "@/lib/data";
import MapSheetFigures from "@/components/MapSheetFigure";

export function generateStaticParams() {
  return getTours().map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tour = getTour(id);
  return { title: tour ? `${tour.name} — On Old Ground` : "Tour — On Old Ground" };
}

export default async function TourPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tour = getTour(id);
  if (!tour) notFound();

  return (
    <article>
      <h1>{tour.name}</h1>
      <p className="small">{tour.meta}</p>
      <p>
        <strong>Free and self-guided.</strong> Go at your own pace, in this order.
      </p>
      {tour.description.split(/\n\s*\n/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}

      <MapSheetFigures entryKey={tour.id} />

      <h2>The stops, in order</h2>
      <div className="rows">
        {tour.stops.map((s, i) => {
          const isReflection = s.siteSlug
            ? getSite(s.siteSlug)?.stopType === "reflection"
            : false;
          const inner = (
            <>
              <span className="t">
                {i + 1}. {s.name}
              </span>
              <span className="small">{s.place}</span>
              {isReflection && <span className="badge reflection">Reflection stop</span>}
              <span>{s.hook}</span>
              {s.gateShort && <span className="small"><strong>{s.gateShort}</strong></span>}
            </>
          );
          return s.siteSlug ? (
            <Link key={i} className="row" href={`/sites/${s.siteSlug}?from=route&group=${encodeURIComponent(id)}`}>
              {inner}
            </Link>
          ) : (
            <div key={i} className="row">
              {inner}
            </div>
          );
        })}
      </div>

      {tour.drive && (
        <section>
          <h2>The drive</h2>
          <p>{tour.drive}</p>
        </section>
      )}
      {tour.season && (
        <section>
          <h2>Season notes</h2>
          <p>{tour.season}</p>
        </section>
      )}
      {tour.landing && (
        <section>
          <h2>Where the story lands</h2>
          <p>{tour.landing}</p>
        </section>
      )}

      {tour.localTours && tour.localTours.length > 0 && (
        <section>
          <h2>Tours you can take there</h2>
          <p className="small">
            Researched from the operators&apos; own advertising, November 2026. Prices and hours
            change — check before you go.
          </p>
          <div className="rows">
            {tour.localTours.map((lt) => (
              <a key={lt.url} className="row" href={lt.url} target="_blank" rel="noreferrer">
                <span className="t">{lt.name}</span>
                <span className="small">
                  {lt.org} · {lt.kind}
                </span>
                <span>{lt.note}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      <p className="small">
        <Link href="/tours">All routes</Link>
      </p>
    </article>
  );
}
