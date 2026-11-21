import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getToursForSite } from "@/lib/data";
import {
  area,
  byGround,
  byTitle,
  buckets,
  catalog,
  countLabel,
  entryUrl,
  grouped,
  inState,
  PAGE,
  pageNumber,
  pathName,
  paths,
  selection,
  stateUrl,
  stopLabel,
  themeUrl,
  url,
  type BrowseRow,
  type Query,
} from "@/lib/browse";

export function Crumbs({
  items,
}: {
  items: { name: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="crumbs">
      <ol>
        {items.map((item, i) => (
          <li key={i}>
            {item.href ? (
              <a href={item.href}>{item.name}</a>
            ) : (
              <span aria-current="page">{item.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
export function SearchBox({
  value = "",
  filters = {},
}: {
  value?: string;
  filters?: Query;
}) {
  return (
    <form className="home-search" action="/catalog" role="search">
      {Object.entries(filters).map(
        ([k, v]) => v && <input type="hidden" key={k} name={k} value={v} />,
      )}
      <input
        type="search"
        name="q"
        defaultValue={value}
        placeholder="Search a place, town or theme"
        aria-label="Search the catalog"
      />
      <button type="submit">Search</button>
    </form>
  );
}
export function IndexLink({
  href,
  label,
  count,
}: {
  href: string;
  label: string;
  count: number;
}) {
  return (
    <a className="index-link" href={href}>
      <span>{label}</span>
      <span className="count">{countLabel(count)}</span>
    </a>
  );
}
export function ThemeLinks({ featured = false }: { featured?: boolean }) {
  const groups = grouped(catalog(), "theme");
  const labels = featured
    ? paths
    : [...new Set([...paths, ...groups.map(([k]) => k)])];
  return (
    <div className="index-grid">
      {labels.map((k) => (
        <IndexLink
          key={k}
          href={themeUrl(k)}
          label={pathName(k)}
          count={groups.find(([g]) => g === k)?.[1].length || 0}
        />
      ))}
    </div>
  );
}
export function Entries({ rows, ctx }: { rows: BrowseRow[]; ctx: Query }) {
  return (
    <ul className="entry-list">
      {rows.map((r) => {
        const routes = getToursForSite(r.slug);
        return (
          <li key={r.slug}>
            <a className="entry-link" href={entryUrl(r, ctx)}>
              <strong>{r.title}</strong>
              <span>
                {[
                  r.town || r.county,
                  r.state,
                  stopLabel(r.stopType).replace(/ stops$/, " stop"),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {routes.length > 0 && (
                <small>On {routes.map((t) => t.name).join(" · ")}</small>
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
export function Pager({
  n,
  total,
  size = PAGE,
  link,
}: {
  n: number;
  total: number;
  size?: number;
  link: (n: number) => string;
}) {
  const pages = Math.ceil(total / size);
  return pages > 1 ? (
    <nav aria-label="Pages" className="pager">
      {n > 1 && <a href={link(n - 1)}>← Previous page</a>}
      <span>
        {n} of {pages}
      </span>
      {n < pages && <a href={link(n + 1)}>Next page →</a>}
    </nav>
  ) : null;
}
export function GroundGroups({ rows, ctx }: { rows: BrowseRow[]; ctx: Query }) {
  return (
    <>
      {buckets(rows, (r) => [r.state]).map(([state, places]) => (
        <section className="ground-group" key={state}>
          <h2>{state}</h2>
          {buckets(places, (r) => [area(r)]).map(([name, items]) => (
            <section key={name}>
              <h3>{name}</h3>
              <Entries rows={items} ctx={ctx} />
            </section>
          ))}
        </section>
      ))}
    </>
  );
}

export function ClusterIndex({
  rows,
  view,
  code = "",
}: {
  rows: BrowseRow[];
  view: string;
  code?: string;
}) {
  const base = code ? stateUrl(code) : "/catalog";
  const groups = grouped(rows, view);
  return (
    <div className="index-grid">
      {groups.map(([group, items]) => {
        const label = view === "stop" ? stopLabel(group) : pathName(group);
        const href = url(base, { view, group });
        if (view !== "area" || items.length <= PAGE)
          return (
            <IndexLink
              key={group}
              href={view === "theme" && !code ? themeUrl(group) : href}
              label={label}
              count={items.length}
            />
          );
        const ordered = [...items].sort(byTitle);
        const short = (r: BrowseRow) =>
          r.title
            .replace(/^HT-RES(?:-[A-Z]{2})?\s*[—:-]\s*/, "")
            .split(/\s+/)
            .slice(0, 3)
            .join(" ");
        return (
          <section key={group} className="range-set">
            <h3>
              {label} <small>{countLabel(items.length)}</small>
            </h3>
            {Array.from({ length: Math.ceil(items.length / PAGE) }, (_, i) => {
              const part = ordered.slice(i * PAGE, (i + 1) * PAGE);
              return (
                <IndexLink
                  key={i}
                  href={href + "&page=" + (i + 1)}
                  label={short(part[0]) + " – " + short(part.at(-1)!)}
                  count={part.length}
                />
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

export function CatalogBrowse({ p, code = "" }: { p: Query; code?: string }) {
  const rows = inState(code);
  if (code && !rows.length) notFound();
  const base = code ? stateUrl(code) : "/catalog";
  const label = code ? rows[0].state : "Full catalog";
  const view = ["theme", "stop"].includes(p.view) ? p.view : "area";
  const group = p.group;
  const ctx = { from: view, group, state: code };
  const items = group ? selection(ctx) : [];
  if (group && !items.length) notFound();
  const name = view === "stop" ? stopLabel(group) : pathName(group);
  const crumbs = [
    { name: "Home", href: "/" },
    { name: label, href: group ? url(base, { view }) : undefined },
  ];
  const page = pageNumber(p.page, items.length);
  const pageRows = items.slice((page - 1) * PAGE, page * PAGE);
  return (
    <>
      <Crumbs items={group ? [...crumbs, { name }] : crumbs} />
      <h1>{group ? name : label}</h1>
      <p className="index-total">
        {countLabel(group ? items.length : rows.length)}
      </p>
      {!group && <SearchBox filters={code ? { state: code } : {}} />}
      <nav aria-label="Group entries" className="switches">
        {[
          ["area", "Town or area"],
          ["theme", "Theme"],
          ["stop", "Stop type"],
        ].map(([key, text]) => (
          <a
            href={url(base, { view: key })}
            aria-current={view === key ? "page" : undefined}
            key={key}
          >
            {text}
          </a>
        ))}
      </nav>
      {group ? (
        <>
          {view === "area" ? (
            <Entries rows={pageRows} ctx={ctx} />
          ) : (
            <GroundGroups rows={pageRows} ctx={ctx} />
          )}
          <Pager
            n={page}
            total={items.length}
            link={(n) => url(base, { view, group, page: String(n) })}
          />
        </>
      ) : !code && view === "area" ? (
        buckets(rows, (r) => [r.state]).map(([name, members]) => (
          <details key={name} className="state-fold">
            <summary>
              {name}
              <span>{countLabel(members.length)}</span>
            </summary>
            <ClusterIndex
              rows={members}
              view="area"
              code={members[0].stateCode}
            />
          </details>
        ))
      ) : (
        <ClusterIndex rows={rows} view={view} code={code} />
      )}
    </>
  );
}

export function SectionTitle({
  children,
  count,
}: {
  children: ReactNode;
  count: number;
}) {
  return (
    <h2>
      {children} <span className="heading-count">{countLabel(count)}</span>
    </h2>
  );
}
