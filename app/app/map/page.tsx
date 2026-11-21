import { notFound } from "next/navigation";
import CatalogMap from "@/components/CatalogMap";
import { Crumbs, GroundGroups, Pager } from "@/components/Browse";
import {
  buckets,
  countLabel,
  entryUrl,
  pageNumber,
  PAGE,
  query,
  selection,
  url,
  type RawQuery,
} from "@/lib/browse";
export const metadata = {
  title: "Catalog map — On Old Ground",
  alternates: { canonical: "/map" },
};
export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<RawQuery>;
}) {
  const p = query(await searchParams),
    code = p.state || "";
  const ctx = { from: "map", state: code };
  const all = selection({ from: "map" });
  const rows = code ? selection(ctx) : all;
  if (code && !rows.length) notFound();
  const n = pageNumber(p.page, rows.length);
  return (
    <>
      <Crumbs
        items={[{ name: "Catalog", href: "/catalog" }, { name: "Map" }]}
      />
      <h1>Catalog map</h1>
      <p className="index-total">
        {countLabel(rows.length)} with verified points
      </p>
      <form action="/map" className="map-filter">
        <label htmlFor="map-state">State</label>
        <select id="map-state" name="state" defaultValue={code}>
          <option value="">All states</option>
          {buckets(all, (r) => [r.state]).map(([name, items]) => (
            <option key={name} value={items[0].stateCode}>
              {name} ({items.length})
            </option>
          ))}
        </select>
        <button className="btn">Show</button>
      </form>
      <CatalogMap
        places={rows.map((r) => ({
          slug: r.slug,
          title: r.title,
          ...r.mapPoint!,
          href: entryUrl(r, ctx),
        }))}
      />
      <h2>Places on this map</h2>
      <GroundGroups rows={rows.slice((n - 1) * PAGE, n * PAGE)} ctx={ctx} />
      <Pager
        n={n}
        total={rows.length}
        link={(i) => url("/map", { state: code, page: String(i) })}
      />
    </>
  );
}
