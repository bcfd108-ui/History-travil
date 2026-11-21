import { Crumbs, Entries, Pager, SearchBox, SectionTitle } from "./Browse";
import {
  pageNumber,
  pathName,
  search,
  searchScope,
  suggestions,
  url,
  type Query,
  type BrowseRow,
} from "@/lib/browse";

const SIZE = 8;
export default function CatalogSearch({ p }: { p: Query }) {
  const scope = searchScope(p);
  const result = search(scope, p.q);
  const filters = Object.fromEntries(
    ["state", "theme", "stop"].filter((k) => p[k]).map((k) => [k, p[k]]),
  );
  const base = { ...filters, q: p.q };
  const ctx = { ...p, ...base, from: "search" };
  const placePage = pageNumber(p.placesPage, result.places.length, SIZE);
  function facets(
    label: string,
    part: string,
    groups: [string, BrowseRow[]][],
  ) {
    const pairs = groups.flatMap(([group, rows]) =>
      rows.map((row) => ({ group, row })),
    );
    const field = part + "Page";
    const n = pageNumber(p[field], pairs.length, SIZE);
    const visible = pairs.slice((n - 1) * SIZE, n * SIZE);
    return (
      <section aria-label={label}>
        <h2>{label}</h2>
        {groups.length === 0 ? (
          <p className="small">No matching {label.toLowerCase()}.</p>
        ) : (
          [...new Set(visible.map((x) => x.group))].map((g) => (
            <section key={g}>
              <h3>{pathName(g)}</h3>
              <Entries
                rows={visible.filter((x) => x.group === g).map((x) => x.row)}
                ctx={{ ...ctx, part, group: g }}
              />
            </section>
          ))
        )}
        <Pager
          n={n}
          total={pairs.length}
          size={SIZE}
          link={(i) => url("/catalog", { ...p, [field]: String(i) })}
        />
      </section>
    );
  }
  return (
    <>
      <Crumbs
        items={[{ name: "Catalog", href: "/catalog" }, { name: "Search" }]}
      />
      <h1>Search</h1>
      <SearchBox value={p.q} filters={filters} />
      {Object.keys(filters).length > 0 && (
        <p>
          <a href={url("/catalog", { q: p.q })}>Search all ground</a>
        </p>
      )}
      {result.places.length ? (
        <>
          <section aria-label="Places">
            <SectionTitle count={result.places.length}>Places</SectionTitle>
            <Entries
              rows={result.places.slice(
                (placePage - 1) * SIZE,
                placePage * SIZE,
              )}
              ctx={ctx}
            />
            <Pager
              n={placePage}
              total={result.places.length}
              size={SIZE}
              link={(n) => url("/catalog", { ...p, placesPage: String(n) })}
            />
          </section>
          {facets("Towns", "town", result.towns)}
          {facets("Themes", "theme", result.themes)}
        </>
      ) : (
        <>
          <h2>No matches</h2>
          <h3>Closest places and towns</h3>
          <ul className="suggestions">
            {suggestions(scope.length ? scope : searchScope({}), p.q).map(
              (s) => (
                <li key={s.label}>
                  <a href={url("/catalog", { q: s.label })}>{s.label}</a>
                </li>
              ),
            )}
          </ul>
        </>
      )}
    </>
  );
}
