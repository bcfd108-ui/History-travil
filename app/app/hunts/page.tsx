import Link from "next/link";
import { getHunts, huntFindsForRender } from "@/lib/data";
import { HuntProgressLine } from "@/components/HuntProgress";

export const metadata = { title: "Hunts — On Old Ground" };

export default function HuntsPage() {
  const hunts = getHunts();
  return (
    <>
      <h1>Hunts</h1>
      <p className="lede">
        A scavenger hunt, not a test. Each hunt names things to go and find on real ground — and
        the tag is the visit itself: stand on the ground, find the thing, and it is yours. A
        photo is welcome, never required. There are no questions and no answer keys.
      </p>
      <p className="small">
        The three founding hunts are live, with their find lists carried from the original
        app&apos;s record. The finds rest on the research record — the hunts stand activated
        on the owner&apos;s word, and no find is represented as field-verified. Nothing is
        scored. A find is tagged from its catalog entry&apos;s page, into your scrapbook and
        stamp book — and where a find&apos;s ground has no entry in this edition yet, its
        catalog entry is in preparation and the find is carried on its own text until the
        entry is published. Completing a hunt records its badge in your stamp book.
        Reflection ground is never part of any hunt.
      </p>
      {hunts.map((h) => {
        const finds = huntFindsForRender(h);
        return (
          <section key={h.slug} className="panel">
            <h2>
              <Link href={`/hunts/${h.slug}`}>{h.name}</Link>
            </h2>
            <p>
              <span className="badge amber">{finds.length} finds</span>
              <span className="badge">{h.tier}</span>
              <span className="m"> {h.ground}</span>
            </p>
            <p>{h.about}</p>
            <HuntProgressLine finds={finds} badge={h.badge} />
            <p>
              <Link href={`/hunts/${h.slug}`}>Open the hunt — its finds and your progress</Link>
            </p>
            <h3>Read the record first</h3>
            <div className="rows">
              {h.related.map((r) => (
                <Link key={r.slug} className="row" href={`/sites/${r.slug}`}>
                  <span className="t">{r.label}</span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
