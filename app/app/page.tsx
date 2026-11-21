import Link from "next/link";
import { getStates, getSites, getHistoricPhoto, getTours } from "@/lib/data";
import { IndexLink, SearchBox, ThemeLinks } from "@/components/Browse";
import { catalog, stateUrl } from "@/lib/browse";

export default function Home() {
  const rows = catalog(),
    states = getStates();
  const featured = getSites()
    .map((site) => ({ site, photo: getHistoricPhoto(site.slug) }))
    .filter((x) => x.photo)
    .slice(0, 6);
  return (
    <>
      <h1>Stand in the footsteps of history.</h1>
      <p className="home-line">
        {rows.length} researched places across {states.length} states
      </p>
      <SearchBox />
      <nav className="browse-bar" aria-label="Browse the catalog">
        <a href="#states">States</a>
        <a href="#themes">Themes</a>
        <a href="/tours">
          Routes <span>{getTours().length}</span>
        </a>
        <a href="/map">Catalog map</a>
      </nav>
      <section id="states">
        <h2>Browse by state</h2>
        <div className="index-grid">
          {states.map((s) => (
            <IndexLink
              key={s.code}
              href={stateUrl(s.code)}
              label={s.name}
              count={s.count}
            />
          ))}
        </div>
      </section>
      <section id="themes">
        <h2>Browse by theme</h2>
        <ThemeLinks featured />
        <p className="more-link">
          <a href="/themes">All themes →</a>
        </p>
      </section>
      {featured.length > 0 && (
        <section>
          <h2>With their photographs</h2>
          <div className="photo-cards">
            {featured.map(({ site, photo }) => (
              <Link
                key={site.slug}
                className="photo-card"
                href={"/sites/" + site.slug}
              >
                <img src={photo!.src} alt={photo!.alt} loading="lazy" />
                <span className="photo-card-t">{site.title}</span>
                <span className="photo-card-m">
                  {[site.town, site.state].filter(Boolean).join(" · ")}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <nav className="browse-bar secondary" aria-label="More on On Old Ground">
        <a href="/catalog">Full catalog</a>
        <a href="/hunts">Hunts</a>
        <a href="/desk">Research Desk</a>
      </nav>
    </>
  );
}
