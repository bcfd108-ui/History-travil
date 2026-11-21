import {ClusterIndex} from "@/components/Browse";
import {inState} from "@/lib/browse";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DESK_GUIDES } from "@/lib/content";
import { getStates, getStats } from "@/lib/data";
import { Md } from "@/lib/md";

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    ...DESK_GUIDES.map((d) => ({ slug: d.slug })),
    ...getStates().map((s) => ({ slug: `state-${s.code.toLowerCase()}` })),
    { slug: "national" },
  ];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = DESK_GUIDES.find((d) => d.slug === slug);
  return { title: `${guide ? guide.title : "Research Desk"} — On Old Ground` };
}

export default async function DeskDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = DESK_GUIDES.find((d) => d.slug === slug);
  if (guide) {
    return (
      <article>
        <p className="small"><Link href="/desk">← Research Desk</Link></p>
        <h1>{guide.title}</h1>
        <Md text={guide.body} />
        <p className="small">
          Written from the project&apos;s governing documents — the publish manifest&apos;s
          fidelity rules, the product law, and the QC compiled summary.
        </p>
      </article>
    );
  }

  if (slug === "national") {
    const stats = getStats();
    const states = getStates();
    return (
      <article>
        <p className="small"><Link href="/desk">← Research Desk</Link></p>
        <h1>National file</h1>
        <p className="lede">
          {stats.sitesConverted} published entries: {stats.reflection} reflection stops and{" "}
          {stats.view} view stops. {stats.withAnyLocatorId} entries carry at least one register or
          archive identifier from a cited source; {stats.withCoordinates} carry coordinates
          printed in their dossiers, and {stats.blankCoordinates} leave coordinates blank — the
          standard working as intended.
        </p>
        <div className="rows">
          {states.map((s) => (
            <Link key={s.code} className="row" href={`/desk/state-${s.code.toLowerCase()}`}>
              <span className="t">{s.name} file</span>
              <span className="m"> — {s.count} entries</span>
            </Link>
          ))}
        </div>
      </article>
    );
  }

  const stateMatch = slug.match(/^state-([a-z]{2})$/);
  if (stateMatch) {
    const code = stateMatch[1].toUpperCase();
    const rows = inState(code);
    if (!rows.length) notFound();
    return (
      <article>
        <p className="small"><Link href="/desk">← Research Desk</Link></p>
        <h1>{rows[0].state} file</h1>
        <p className="index-total">{rows.length} entries</p>
        <ClusterIndex rows={rows} view="area" code={code}/>
      </article>
    );
  }

  notFound();
}
