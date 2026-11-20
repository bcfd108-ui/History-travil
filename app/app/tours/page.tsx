import Link from "next/link";

export const metadata = { title: "Tours — History Travel" };

export default function ToursPage() {
  return (
    <>
      <h1>Tours</h1>
      <p className="lede">
        Tours chain entries into a route — one ground, one afternoon, the stops in the order the
        story happened.
      </p>
      <section className="panel">
        <h2>Where the tours stand</h2>
        <p>
          Seven tours exist in the current app. Their route records are held in the app and are
          not part of the research files this edition is built from, so they are not listed here
          rather than reconstructed from memory — the record or nothing. Tours arrive with the
          database stage, from the same source as the catalog.
        </p>
        <p>
          One walk is in design now: the <strong>Lewiston City Walk</strong>, a chained afternoon
          through Lewiston&apos;s own entries — Locomotive Park, the depot, Main Street, Normal
          Hill, and the confluence, where the walk goes quiet at the Nez Perce beat. Its stops are
          all in the catalog today:
        </p>
        <div className="rows">
          <Link className="row" href="/sites/lewiston-locomotive-park"><span className="t">Locomotive Park / Engine 92</span></Link>
          <Link className="row" href="/sites/lewiston-depot"><span className="t">Lewiston Depot</span></Link>
          <Link className="row" href="/sites/lewiston-main-street"><span className="t">Historic Main Street</span></Link>
          <Link className="row" href="/sites/lewiston-normal-hill"><span className="t">Normal Hill</span></Link>
          <Link className="row" href="/sites/lewiston-confluence"><span className="t">Snake–Clearwater Confluence</span></Link>
        </div>
      </section>
    </>
  );
}
