import Link from "next/link";
import { HUNTS } from "@/lib/content";

export const metadata = { title: "Hunts — History Travel" };

export default function HuntsPage() {
  return (
    <>
      <h1>Hunts</h1>
      <p className="lede">
        A scavenger hunt, not a test. Each hunt names things to go and find on real ground — and
        the tag is the visit itself: stand on the ground, find the thing, and it is yours. A
        photo is welcome, never required. There are no questions and no answer keys.
      </p>
      <p className="small">
        The hunts&apos; own find lists live in the current app. In this edition, the record
        behind each hunt is below — and where an entry carries candidate finds from the
        research record, you can tag them with your photo from the entry&apos;s own page, into
        your scrapbook and stamp book. Candidates are labelled as what they are: not yet
        field-checked or activated. Reflection ground is never part of any hunt.
      </p>
      {HUNTS.map((h) => (
        <section key={h.slug} className="panel">
          <h2>{h.name}</h2>
          <p>
            <span className="badge amber">{h.findsInApp} finds</span>
            <span className="m"> {h.ground}</span>
          </p>
          <p>{h.about}</p>
          <h3>Read the record first</h3>
          <div className="rows">
            {h.related.map((r) => (
              <Link key={r.slug} className="row" href={`/sites/${r.slug}`}>
                <span className="t">{r.label}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
