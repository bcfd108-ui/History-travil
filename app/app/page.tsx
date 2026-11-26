import Link from "next/link";
import Image from "next/image";
import { getStates, getSites, getHistoricPhoto, getPublicTitle, getTours } from "@/lib/data";
import { IndexLink, SearchBox, ThemeLinks } from "@/components/Browse";
import SponsorBlock from "@/components/SponsorBlock";
import { catalog, stateUrl } from "@/lib/browse";

export default function Home() {
  const rows = catalog(),
    states = getStates();
  const topStates = [...states].sort((a, b) => b.count - a.count).slice(0, 8);
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
      <p className="hero-actions">
        <Link className="near-cta" href="/near">
          Near Here — the history around you, right now
        </Link>
      </p>
      <section className="how-it-works" aria-label="How On Old Ground works">
        <div className="how-step">
          <strong><span className="step-n">1.</span> Find the ground</strong>
          <p>
            Search the catalog. Every place is researched and sourced, with the
            record printed as it stands.
          </p>
        </div>
        <div className="how-step">
          <strong><span className="step-n">2.</span> Go stand on it</strong>
          <p>
            Near Here shows the researched ground around you. The site is built
            to be read standing on the spot.
          </p>
        </div>
        <div className="how-step">
          <strong><span className="step-n">3.</span> Play the hunt</strong>
          <p>
            Hunts and Routes string the ground together. Being there is the
            tag — the find is you, on the ground.
          </p>
        </div>
      </section>
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
          {topStates.map((s) => (
            <IndexLink
              key={s.code}
              href={stateUrl(s.code)}
              label={s.name}
              count={s.count}
            />
          ))}
        </div>
        <details className="states-more">
          <summary>View all {states.length} states</summary>
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
        </details>
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
                <Image src={photo!.src} alt={photo!.alt} width={photo!.width} height={photo!.height} sizes="(max-width: 520px) 90vw, 320px" />
                <span className="photo-card-t">{getPublicTitle(site.slug).name}</span>
                <span className="photo-card-c">{photo!.caption}</span>
                <span className="photo-card-m">
                  {[site.town, site.state].filter(Boolean).join(" · ")}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <SponsorBlock variant="full" />
      <nav className="browse-bar secondary" aria-label="More on On Old Ground">
        <a href="/catalog">Full catalog</a>
        <a href="/hunts">Hunts</a>
        <a href="/desk">Research Desk</a>
      </nav>
    </>
  );
}
