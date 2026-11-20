import Link from "next/link";
import { getStats, getStates, getSites, getHistoricPhoto } from "@/lib/data";

export default function Home() {
  const stats = getStats();
  const states = getStates();
  const featured = getSites()
    .map((s) => ({ site: s, photo: getHistoricPhoto(s.slug) }))
    .filter((x) => x.photo);

  return (
    <>
      <h1>Stand in the footsteps of history.</h1>
      <p className="home-line">
        {stats.sitesConverted} researched places across {states.length} states — every one
        sourced, every one ground you can stand on.
      </p>

      <form className="home-search" action="/catalog" method="get" role="search">
        <input
          type="search"
          name="q"
          placeholder="Search a place, a town, a theme…"
          aria-label="Search the catalog"
        />
        <button type="submit">Search</button>
      </form>

      {featured.length > 0 && (
        <>
          <h2>With their photographs</h2>
          <div className="photo-cards">
            {featured.map(({ site, photo }) => (
              <Link key={site.slug} className="photo-card" href={`/sites/${site.slug}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo!.src} alt={photo!.alt} loading="lazy" />
                <span className="photo-card-t">{site.title}</span>
                <span className="photo-card-m">
                  {[site.town, site.state].filter(Boolean).join(" · ")}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      <h2>Browse by state</h2>
      <div className="rows">
        {states.map((s) => (
          <Link key={s.code} className="row" href={`/catalog?state=${s.code}`}>
            <span className="t">{s.name}</span>
            <span className="m"> — {s.count} entries</span>
          </Link>
        ))}
      </div>

      <p className="linkrow">
        <Link href="/hunts">Hunts</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/desk">Research Desk</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/tours">Tours</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/catalog">Full catalog</Link>
      </p>
    </>
  );
}
