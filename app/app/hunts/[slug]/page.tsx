import Link from "next/link";
import { notFound } from "next/navigation";
import { getHunt, getHunts } from "@/lib/data";
import { HuntBookProvider, HuntFindList, ProgressLine } from "@/components/HuntProgress";

export const dynamicParams = false;
export function generateStaticParams() { return getHunts().map(h => ({ slug: h.slug })); }
type Params = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  return { title: (getHunt(slug)?.name || "Hunt") + " — On Old Ground", alternates: { canonical: "/hunts/" + slug } };
}
export default async function HuntPage({ params }: Params) {
  const h = getHunt((await params).slug);
  if (!h) notFound();
  return <article><Link href="/hunts">← Hunts</Link>
    <h1>{h.name}</h1><p>{h.area}, {h.region} · {h.theme}</p>
    <div className="hunt-insignia"><span>{h.badge}</span><small>{h.tier}</small></div>
    <p>{h.tied} of {h.finds.length} finds tied</p>
    <HuntBookProvider>
      <ProgressLine hunt={h.slug} finds={h.finds} />
      <HuntFindList hunt={h.slug} finds={h.finds} />
    </HuntBookProvider>
    {h.related.length > 0 && <details className="hunt-rules"><summary>Related reading</summary>
      <ul>{h.related.map(r => <li key={r.slug}><Link href={"/sites/" + r.slug}>{r.label}</Link></li>)}</ul>
    </details>}
  </article>;
}
