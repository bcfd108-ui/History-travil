import { Md } from "@/lib/md";
import { visitLabels } from "@/lib/visit-facts.mjs";
import type { PlainTop, Site, VisitFacts } from "@/lib/data";

export function PlainOpening({ top }: { top: PlainTop }) {
  const paragraphs = top.sections.filter(s => !["What you can see now", "What to look for", "Before you go"].includes(s.heading));
  const features = top.sections.filter(s => ["What you can see now", "What to look for"].includes(s.heading));
  return (
    <div className="plain-opening">
      {[{ heading: "Why this place matters", sections: paragraphs }, { heading: "What to look for", sections: features }].map(group =>
        group.sections.length > 0 && <section key={group.heading}>
          <h2>{group.heading}</h2>
          {group.sections.map(section => <div key={section.heading}>
            {section.paragraphs?.map(p => <p key={p}>{p}</p>)}
            {section.bullets && <ul>{section.bullets.map(b => <li key={b}>{b}</li>)}</ul>}
          </div>)}
        </section>
      )}
    </div>
  );
}

export function FullRecord({ site, voices }: { site: Site; voices?: string[] }) {
  const sections = [
    { id: "story", title: "The story", body: [site.standfirst, site.lead, site.story].filter(Boolean).join("\n\n") },
    { id: "then-now", title: "Then / now", body: site.thenNow },
    { id: "still-there", title: "What’s still there", body: site.stillThere },
    { id: "step-by-step", title: "The stop, step by step", body: site.progression },
    ...site.moreSections.map((sec, i) => ({ ...sec, id: "record-section-" + (i + 1) })),
  ].filter(sec => sec.body);
  return <section className="full-record" aria-labelledby="full-record">
    <h2 id="full-record">The full record</h2>
    <nav className="record-contents" aria-label="Contents of the full record">
      {sections.map(sec => <a key={sec.id} href={"#" + sec.id}>{sec.title}</a>)}
    </nav>
    {sections.map(sec => <section key={sec.id} id={sec.id}>
      <h3>{sec.title}</h3><Md text={sec.body} voices={voices} />
    </section>)}
  </section>;
}

export function VisitTable({ facts }: { facts: VisitFacts }) {
  return <table className="visit-facts" id="good-to-know">
    <caption>Good to know</caption>
    <tbody>{Object.entries(visitLabels).map(([key, label]) => {
      const fact = facts.rows[key];
      if (!fact) return null;
      return <tr key={key}><th scope="row">{label}</th><td>
        {key === "website" ? <a href={fact.value} rel="noreferrer" target="_blank">{new URL(fact.value).hostname}</a> : fact.value}
      </td></tr>;
    })}</tbody>
  </table>;
}
