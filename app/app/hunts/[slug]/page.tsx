import Link from "next/link";
import { notFound } from "next/navigation";
import { getHunt, getHunts, huntFindsForRender } from "@/lib/data";
import { HuntFindList } from "@/components/HuntProgress";

export const dynamicParams = false;

export function generateStaticParams() {
  return getHunts().map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hunt = getHunt(slug);
  return { title: hunt ? `${hunt.name} — On Old Ground` : "Hunt — On Old Ground" };
}

export default async function HuntPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hunt = getHunt(slug);
  if (!hunt) notFound();
  const finds = huntFindsForRender(hunt);

  return (
    <article>
      <p className="small"><Link href="/hunts">← Hunts</Link></p>
      <h1>{hunt.name}</h1>
      <p>
        <span className="badge amber">{finds.length} finds</span>
        <span className="badge">{hunt.tier}</span>
        <span className="badge">{hunt.status === "active" ? "Active hunt" : "Candidate hunt — not yet field-checked or activated"}</span>
      </p>
      <p className="lede">{hunt.ground}</p>
      <p>{hunt.about}</p>
      <p>
        <strong>The badge:</strong> {hunt.badge} — {hunt.badgeTheme}. Completing the hunt
        records the badge in your stamp book. Nothing is scored; there are no points, no
        questions, and no answer keys.
      </p>
      <p className="small">
        These finds are carried from the original app&apos;s find lists, from the research
        record. The hunt is <strong>active</strong> — activated on the owner&apos;s word, on
        the strength of the record; no find is claimed as field-verified. A find is tagged
        by going to its ground and being there, from its catalog entry&apos;s page; a photo
        is welcome, never required. Where a find&apos;s ground has no entry in this
        edition&apos;s catalog yet, its catalog entry is in preparation — the find is listed
        on its own text and joins the hunt when the entry is published; no tie is invented
        to fill the gap. Reflection ground is never part of any hunt.
      </p>

      <h2>The finds</h2>
      <HuntFindList badge={hunt.badge} finds={finds} />

      <h2>Read the record first</h2>
      <div className="rows">
        {hunt.related.map((r) => (
          <Link key={r.slug} className="row" href={`/sites/${r.slug}`}>
            <span className="t">{r.label}</span>
          </Link>
        ))}
      </div>

      <p className="small">
        <Link href="/hunts">All hunts</Link>
      </p>
    </article>
  );
}
