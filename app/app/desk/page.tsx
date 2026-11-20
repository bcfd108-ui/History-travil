import Link from "next/link";
import { DESK_GUIDES } from "@/lib/content";
import { getStates, getStats } from "@/lib/data";

export const metadata = { title: "Research Desk — History Travel" };

export default function DeskPage() {
  const states = getStates();
  const stats = getStats();
  return (
    <>
      <h1>Research Desk</h1>
      <p className="lede">
        The desk is an index, not a wall of text. Every row opens its own page: the guides explain
        how the record is built and how to read it; each state file lists that state&apos;s
        entries.
      </p>

      <h2>Guides</h2>
      <div className="rows">
        {DESK_GUIDES.map((d) => (
          <Link key={d.slug} className="row" href={`/desk/${d.slug}`}>
            <span className="t">{d.title}</span>
            <div className="m">{d.blurb}</div>
          </Link>
        ))}
      </div>

      <h2>State files</h2>
      <div className="rows">
        {states.map((s) => (
          <Link key={s.code} className="row" href={`/desk/state-${s.code.toLowerCase()}`}>
            <span className="t">{s.name} file</span>
            <span className="m"> — {s.count} entries</span>
          </Link>
        ))}
        <Link className="row" href="/desk/national">
          <span className="t">National file</span>
          <span className="m">
            {" "}— the whole catalog at a glance: {stats.sitesConverted} entries,{" "}
            {stats.withAnyLocatorId} carrying a register or archive identifier,{" "}
            {stats.blankCoordinates} with coordinates deliberately blank in the record
          </span>
        </Link>
      </div>
    </>
  );
}
