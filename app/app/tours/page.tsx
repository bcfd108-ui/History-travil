import Link from "next/link";
import { getTours } from "@/lib/data";

export const metadata = { title: "Tours — History Travel" };

export default function ToursPage() {
  const tours = getTours();
  return (
    <>
      <h1>Tours</h1>
      <p className="lede">
        Tours chain entries into a route — one ground, one afternoon, the stops in the order the
        story happened.
      </p>
      <p>
        Every tour here is <strong>free and self-guided</strong> — walk or drive it at your own
        pace. Where a town or a company runs a tour of the same ground, the tour page lists it
        too, researched from their own advertising, so everything is in one place.
      </p>
      <div className="rows">
        {tours.map((t) => (
          <Link key={t.id} className="row" href={`/tours/${t.id}`}>
            <span className="t">{t.name}</span>
            <span className="small">
              {t.meta} — {t.stops.length} stop{t.stops.length === 1 ? "" : "s"}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
