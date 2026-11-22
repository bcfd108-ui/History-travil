import Link from "next/link";
import { notFound } from "next/navigation";
import { getHunts, getResolvedHunt, huntFindsForRender } from "@/lib/data";
import { CheckFind, HuntProgressPanel } from "@/components/HuntProgress";
import { HuntBadge } from "@/components/HuntBadge";
import { findAnchor } from "@/lib/hunt-start.mjs";

export const dynamicParams = false;

export function generateStaticParams() {
  return getHunts().map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hunt = getResolvedHunt(slug);
  return { title: hunt ? `${hunt.name} — On Old Ground` : "Hunt — On Old Ground" };
}

export default async function HuntPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hunt = getResolvedHunt(slug);
  if (!hunt) notFound();
  const finds = huntFindsForRender(hunt);
  const refs = finds.map((f) => ({ n: f.n, label: f.label, tiedSlug: f.tie.slug, status: f.status }));

  return (
    <article className="hunts-page">
      <p className="small">
        <Link href="/hunts">← Hunts</Link>
      </p>
      <div className="hunt-title">
        <HuntBadge
          size="lg"
          mark={hunt.themeInfo.mark}
          themeLabel={hunt.themeInfo.label}
          tier={hunt.difficulty.n}
          tierName={hunt.difficulty.name}
        />
        <div>
          <h1>{hunt.name}</h1>
          <p>
            <span className="badge amber">
              {hunt.counts.tied} of {hunt.counts.total} finds tied
            </span>
            <span className="badge">
              {hunt.difficulty.n ? `Tier ${hunt.difficulty.n} — ${hunt.difficulty.name}` : hunt.difficulty.name}
            </span>
            <span className="badge">{hunt.themeInfo.label}</span>
            <span className="badge">{hunt.region}</span>
            <span className="badge">{hunt.status === "active" ? "Active hunt" : hunt.status}</span>
          </p>
        </div>
      </div>
      <p className="lede">{hunt.ground}</p>
      <p>{hunt.about}</p>
      <p>
        <strong>The badge:</strong> {hunt.badge} — {hunt.badgeTheme}.
      </p>
      <p className="small">
        Signed in, you check a find by standing on its ground and tapping &ldquo;I&apos;m
        here&rdquo; — your location at that moment is the witness. A photo is optional. There are
        no questions and no answer keys.
      </p>

      <HuntProgressPanel slug={hunt.slug} name={hunt.name} active={hunt.status === "active"} badge={hunt.badge} finds={refs} />

      <h2 id="finds" tabIndex={-1}>The finds</h2>
      <div className="find-list">
        {finds.map((f) => {
          const tied = f.tie.status === "tied" && f.tie.slug;
          return (
            <section key={f.n} id={findAnchor(f.n)} tabIndex={-1} className={`find-card${tied ? "" : " untied"}`} aria-label={`Find ${f.n}`}>
              <p className="find-n">Find {f.n}</p>
              <h3>{f.label}</h3>
              <p className="small">
                {f.groundName} · {f.place}
              </p>
              {tied ? (
                <p className="find-entry">
                  Catalog entry: <Link href={`/sites/${f.tie.slug}`}>{f.tie.title}</Link>
                </p>
              ) : (
                <p className="find-entry">
                  <span className="badge prep">catalog entry in preparation</span>{" "}
                  <span className="small">Not counted toward the badge until the entry is published.</span>
                </p>
              )}
              <p className="find-task">{f.task}</p>
              {f.hint && (
                <details className="find-hint">
                  <summary>Show the hint</summary>
                  <p>{f.hint}</p>
                </details>
              )}
              {tied && <CheckFind huntSlug={hunt.slug} find={{ n: f.n, label: f.label, tiedSlug: f.tie.slug }} />}
            </section>
          );
        })}
      </div>

      <details className="sources">
        <summary>How this hunt&apos;s difficulty was set</summary>
        <p>
          {hunt.difficulty.n ? `Tier ${hunt.difficulty.n} — ${hunt.difficulty.name}. ` : ""}
          {hunt.difficulty.plain}
        </p>
        <ul>
          {hunt.difficulty.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="small">Computed from the tied finds&apos; catalog entries on every build. See the rule on the Hunts page.</p>
      </details>

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
