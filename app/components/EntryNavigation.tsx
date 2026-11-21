import { Crumbs, Entries } from "./Browse";
import { getTour, getToursForSite } from "@/lib/data";
import {
  area,
  areaContext,
  catalog,
  entryUrl,
  moreGround,
  PAGE,
  pathName,
  selection,
  stateUrl,
  stopLabel,
  themeUrl,
  url,
  type Query,
} from "@/lib/browse";

export function EntryNavigation({
  slug,
  context = {},
}: {
  slug: string;
  context?: Query;
}) {
  const row = catalog().find((r) => r.slug === slug)!;
  let ctx = context;
  let items = selection(ctx);
  let pos = items.findIndex((r) => r.slug === slug);
  if (pos < 0) {
    ctx = areaContext(row);
    items = selection(ctx);
    pos = items.findIndex((r) => r.slug === slug);
  }
  const state = stateUrl(row.stateCode);
  const number = String(Math.floor(pos / PAGE) + 1);
  const local = selection(areaContext(row));
  const localPage = String(
    Math.floor(local.findIndex((r) => r.slug === slug) / PAGE) + 1,
  );
  let crumbs = [
    { name: row.state, href: state },
    {
      name: area(row),
      href: url(state, { view: "area", group: area(row), page: localPage }),
    },
  ];
  const base = ctx.state ? stateUrl(ctx.state) : "/catalog";
  if (ctx.from === "theme") {
    crumbs = ctx.state
      ? [
          { name: row.state, href: state },
          {
            name: pathName(ctx.group),
            href: url(base, { view: "theme", group: ctx.group, page: number }),
          },
        ]
      : [
          { name: "Themes", href: "/themes" },
          {
            name: pathName(ctx.group),
            href: url(themeUrl(ctx.group), { page: number }),
          },
        ];
  } else if (ctx.from === "stop") {
    crumbs.push({
      name: stopLabel(ctx.group),
      href: url(base, { view: "stop", group: ctx.group, page: number }),
    });
  } else if (ctx.from === "route") {
    const t = getTour(ctx.group);
    if (t) crumbs.unshift({ name: t.name, href: "/tours/" + t.id });
  } else if (ctx.from === "map") {
    crumbs.unshift({
      name: "Catalog map",
      href: url("/map", { state: ctx.state, page: number }),
    });
  } else if (ctx.from === "search") {
    // A facet contains its own ordered subset. Keep the original results page
    // when available, including its state/theme scope and independent pagers.
    const back = Object.fromEntries(
      Object.entries(ctx).filter(([k]) =>
        [
          "q",
          "theme",
          "state",
          "stop",
          "placesPage",
          "townPage",
          "themePage",
        ].includes(k),
      ),
    );
    if (!ctx.part) back.placesPage = String(Math.floor(pos / 8) + 1);
    crumbs.unshift({ name: "Search results", href: url("/catalog", back) });
  }
  const tours = getToursForSite(slug);
  return (
    <>
      <Crumbs items={[...crumbs, { name: row.title }]} />
      <nav className="reading-nav" aria-label="Entries in this group">
        {pos > 0 && (
          <a rel="prev" href={entryUrl(items[pos - 1], ctx)}>
            ← Previous entry<span>{items[pos - 1].title}</span>
          </a>
        )}
        {pos + 1 < items.length && (
          <a rel="next" href={entryUrl(items[pos + 1], ctx)}>
            Next entry →<span>{items[pos + 1].title}</span>
          </a>
        )}
      </nav>
      {tours.length > 0 && (
        <nav className="route-links" aria-label="Routes through this place">
          {tours.map((t) => (
            <a key={t.id} href={"/tours/" + t.id}>
              {t.name}
            </a>
          ))}
        </nav>
      )}
    </>
  );
}
export function MoreGround({ slug }: { slug: string }) {
  const row = catalog().find((r) => r.slug === slug)!;
  const others = moreGround(row);
  return others.length ? (
    <section aria-label="More from this ground">
      <h2>More from this ground</h2>
      {others.map((r) => (
        <Entries
          key={r.slug}
          rows={[r]}
          ctx={
            row.town && r.town === row.town && row.stateCode === r.stateCode
              ? areaContext(row)
              : {
                  from: "theme",
                  group: row.themes.find((t) => r.themes.includes(t))!,
                }
          }
        />
      ))}
    </section>
  ) : null;
}
