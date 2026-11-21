import { Crumbs } from "@/components/Browse";
import { getTours } from "@/lib/data";
import { routeRegion } from "@/lib/browse";
export const metadata = {
  title: "Routes — On Old Ground",
  alternates: { canonical: "/tours" },
};
export default function ToursPage() {
  const tours = getTours();
  const regions = [...new Set(tours.map(routeRegion))].sort();
  return (
    <>
      <Crumbs items={[{ name: "Home", href: "/" }, { name: "Routes" }]} />
      <h1>Routes</h1>
      <p className="index-total">{tours.length} routes</p>
      {regions.map((region) => (
        <section key={region}>
          <h2>{region}</h2>
          <div className="index-grid">
            {tours
              .filter((t) => routeRegion(t) === region)
              .map((t) => (
                <a key={t.id} className="index-link" href={"/tours/" + t.id}>
                  <span>{t.name}</span>
                  <small>
                    {t.stops.length} {t.stops.length === 1 ? "stop" : "stops"}
                  </small>
                </a>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
