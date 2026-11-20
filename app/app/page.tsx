import Link from "next/link";
import { getStats, getStates } from "@/lib/data";

export default function Home() {
  const stats = getStats();
  const states = getStates();
  return (
    <>
      <h1>The history is out there. This is how you find it.</h1>
      <p className="lede">
        History Travel is a historical road trip reference built from primary sources — the
        people&apos;s own words, the register records, the archive catalogues — assembled into one
        place you can actually use. The coolest history in a place you don&apos;t know is the
        hardest to find. This is the finder.
      </p>
      <p className="lede">
        It is a research app with a game: the reference is the product, and layered on it is a
        scavenger hunt — go to the ground, find the thing, and be there. Being there is the tag.
      </p>

      <div className="cards">
        <Link className="card" href="/catalog">
          <h3>Browse the catalog</h3>
          <p>
            {stats.sitesConverted} researched entries across {states.length} states —{" "}
            {stats.reflection} reflection stops, {stats.withCoordinates} with coordinates recorded
            in their dossiers. Search it, filter it, read any entry end to end from home.
          </p>
        </Link>
        <Link className="card" href="/desk">
          <h3>Research Desk</h3>
          <p>
            How the record is built and how to read it — the standard, the stop types, the game
            law — plus a file for every state in the catalog.
          </p>
        </Link>
        <Link className="card" href="/hunts">
          <h3>Hunts</h3>
          <p>
            The Pulaski Hunt, the Valley Hunt, and the Mining Country Hunt — photo-tag scavenger
            hunts on real ground. Reflection ground is never part of the game.
          </p>
        </Link>
        <Link className="card" href="/tours">
          <h3>Tours</h3>
          <p>Chained routes through the record — what exists, and what is still being built.</p>
        </Link>
      </div>

      <h2>How it works</h2>
      <div className="cards">
        <div className="card">
          <h3>1. Read the record</h3>
          <p>
            Every entry carries its sources, its disagreements, and its honest gaps. Planning and
            deep study run at full depth from home — nothing is gated behind being there.
          </p>
        </div>
        <div className="card">
          <h3>2. Go to the ground</h3>
          <p>
            Access comes first on every entry: where you may stand, what is closed, what needs
            checking. A pin is not an entrance.
          </p>
        </div>
        <div className="card">
          <h3>3. Being there is the tag</h3>
          <p>
            On hunt ground, you find the named thing and your being there claims it. A photo is
            yours to add if you want it — never required. No quizzes, no answer keys — you
            learn by going.
          </p>
        </div>
      </div>

      <h2>Start with a state</h2>
      <div className="rows">
        {states.map((s) => (
          <Link key={s.code} className="row" href={`/catalog?state=${s.code}`}>
            <span className="t">{s.name}</span>
            <span className="m"> — {s.count} entries</span>
          </Link>
        ))}
      </div>
    </>
  );
}
