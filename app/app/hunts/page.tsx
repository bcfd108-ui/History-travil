import Link from "next/link";
import { getHunts, type Hunt } from "@/lib/data";
import { tierRules } from "@/lib/hunts";
import { HuntBookProvider, ProgressLine } from "@/components/HuntProgress";

export const metadata = { title: "Hunts — On Old Ground", alternates: { canonical: "/hunts" } };

function group(hunts: Hunt[], field: "region" | "theme") {
  const groups = new Map<string, Hunt[]>();
  for (const hunt of hunts) groups.set(hunt[field], [...(groups.get(hunt[field]) ?? []), hunt]);
  return [...groups].sort(([a], [b]) => a.localeCompare(b));
}

export default function HuntsPage() {
  const hunts = getHunts();
  const total = hunts.reduce((n, h) => n + h.finds.length, 0);
  const tied = hunts.reduce((n, h) => n + h.tied, 0);
  return <HuntBookProvider>
    <h1>Hunts</h1>
    <p className="hunt-count">{hunts.length} {hunts.length === 1 ? "hunt" : "hunts"} · {tied} of {total} finds tied to the catalog</p>
    {group(hunts, "region").map(([region, regional]) => <section key={region}>
      <h2>{region}</h2>
      <div className="hunt-grid">{group(regional, "theme").map(([theme, themed]) => <section key={theme}>
        <h3>{theme}</h3>{themed.map(h => <article className="hunt-card" key={h.slug}>
          <div className="hunt-insignia"><span>{h.badge}</span><small>{h.tier}</small></div>
          <h4><Link href={"/hunts/" + h.slug}>{h.name}</Link></h4>
          <p>{h.area}, {h.region}</p>
          <p>{h.tied} of {h.finds.length} finds tied</p>
          <ProgressLine hunt={h.slug} finds={h.finds.map(({ id, entrySlug, legacyLabels }) => ({ id, entrySlug, legacyLabels }))} />
        </article>)}
      </section>)}</div>
    </section>)}
    <details className="hunt-rules"><summary>How badge difficulty is set</summary>
      <p>Only finds tied to catalog entries count. Distances are straight-line distances between recorded sites.</p>
      <ul>{tierRules.map(s => <li key={s}>{s}</li>)}</ul>
    </details>
  </HuntBookProvider>;
}
