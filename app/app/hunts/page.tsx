import Link from "next/link";
import { getResolvedHunts, getTierTable, huntFindsForRender, type ResolvedHunt } from "@/lib/data";
import { HuntCardProgress } from "@/components/HuntProgress";
import { HuntBadge } from "@/components/HuntBadge";
import { huntStart } from "@/lib/hunt-start.mjs";

export const metadata = { title: "Hunts — On Old Ground" };

// Every number on this page is computed from data/hunts.json and
// data/sites.json at build time (lib/data.ts getResolvedHunts). Nothing is
// hard-coded: when the desk publishes an entry that ties an untied find,
// the counts and the tier move on the next build.

function stateOf(h: ResolvedHunt): string {
  return h.states.length ? h.states.map((s) => s.name).join(" / ") : "Not yet placed";
}

function group<T>(items: T[], keyOf: (t: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = keyOf(it);
    m.set(k, [...(m.get(k) || []), it]);
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function HuntCard({ h }: { h: ResolvedHunt }) {
  const finds = huntFindsForRender(h).map((f) => ({ ...f, tiedSlug: f.tie.slug }));
  const active = h.status === "active";
  const first = huntStart(finds, null, active).find;
  return (
    <div className="hunt-card">
      <div className="hc-head">
        <HuntBadge mark={h.themeInfo.mark} themeLabel={h.themeInfo.label} tier={h.difficulty.n} tierName={h.difficulty.name} />
        <div>
          <h4>
            <Link href={`/hunts/${h.slug}`}>{h.name}</Link>
          </h4>
          <p className="small">{h.badge}</p>
        </div>
      </div>
      <dl className="hc-facts">
        <div>
          <dt>Region</dt>
          <dd>{h.region}</dd>
        </div>
        <div>
          <dt>Finds tied</dt>
          <dd>
            {h.counts.tied} of {h.counts.total}
          </dd>
        </div>
        <div>
          <dt>Difficulty</dt>
          <dd>{h.difficulty.n ? `Tier ${h.difficulty.n} — ${h.difficulty.name}` : h.difficulty.name}</dd>
        </div>
      </dl>
      {first && (
        <details className="find-hint hc-clue">
          <summary>Preview the first clue</summary>
          <p><strong>{first.label}</strong><br />{first.task}</p>
        </details>
      )}
      <HuntCardProgress
        slug={h.slug}
        name={h.name}
        active={active}
        badge={h.badge}
        finds={finds.map(({ n, label, tiedSlug, status }) => ({ n, label, tiedSlug, status }))}
      />
    </div>
  );
}

export default function HuntsPage() {
  const hunts = getResolvedHunts();
  const finds = hunts.reduce((n, h) => n + h.counts.total, 0);
  const tied = hunts.reduce((n, h) => n + h.counts.tied, 0);
  const byState = group(hunts, stateOf);

  return (
    <div className="hunts-page">
      <h1>Hunts</h1>
      <p className="lede">
        A scavenger hunt, not a test. Each hunt names things to go and find on real ground — and
        the tag is the visit itself: stand on the ground, find the thing, and it is yours. A
        photo is welcome, never required. There are no questions and no answer keys.
      </p>
      <p className="count-strip" aria-label="Hunt counts">
        <span>
          <strong>{hunts.length}</strong> {hunts.length === 1 ? "hunt" : "hunts"}
        </span>
        <span>
          <strong>{finds}</strong> finds
        </span>
        <span>
          <strong>{tied}</strong> of {finds} tied to catalog entries
        </span>
        <span>
          <strong>{finds - tied}</strong> catalog {finds - tied === 1 ? "entry" : "entries"} in preparation
        </span>
      </p>

      {byState.map(([state, inState]) => (
        <section key={state} className="hunt-state">
          <h2>{state}</h2>
          {group(inState, (h) => h.region).map(([region, inRegion]) => (
            <div key={region} className="hunt-region">
              <h3>{region}</h3>
              {group(inRegion, (h) => h.themeInfo.label).map(([theme, inTheme]) => (
                <div key={theme} className="hunt-theme">
                  <p className="theme-label">{theme}</p>
                  <div className="hunt-cards">
                    {inTheme.map((h) => (
                      <HuntCard key={h.slug} h={h} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>
      ))}

      <details className="sources">
        <summary>How the hunts work</summary>
        <ul>
          <li>Being there is the tag. A photo is optional and goes to your own scrapbook first.</li>
          <li>
            A find whose ground has no catalog entry yet shows &ldquo;catalog entry in
            preparation&rdquo;. It does not count toward the badge or completion until its entry
            is published — then it joins the hunt on its own.
          </li>
          <li>Reflection ground is never part of any hunt: no finds, no tags, no points.</li>
        </ul>
        <h3>How difficulty is set</h3>
        <p>The tier comes from the ground of the hunt&apos;s tied finds, by one rule for every hunt:</p>
        <ol className="tier-table">
          {getTierTable().map((t) => (
            <li key={t.n}>
              <strong>
                Tier {t.n} — {t.name}:
              </strong>{" "}
              {t.plain}
            </li>
          ))}
        </ol>
        <p className="small">
          Seasonal or remote means the entry&apos;s Before you go record names seasonal access or
          remote access (high-clearance, four-wheel, boat-only, backcountry). A trail walk means
          the visitable anchor is a trail. Distance is the straight line between the entries&apos;
          recorded points. Untied finds are left out until their entries are published.
        </p>
      </details>
    </div>
  );
}
