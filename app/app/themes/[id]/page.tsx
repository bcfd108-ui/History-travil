import { notFound } from "next/navigation";
import { Crumbs, GroundGroups, Pager } from "@/components/Browse";
import {
  PAGE,
  countLabel,
  pageNumber,
  pathName,
  query,
  selection,
  themeId,
  themeList,
  themeUrl,
  url,
  type RawQuery,
} from "@/lib/browse";
type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawQuery>;
};
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const label = themeList().find((t) => themeId(t) === id);
  return {
    title: (label ? pathName(label) : "Theme") + " — On Old Ground",
    alternates: { canonical: "/themes/" + id },
  };
}
export default async function Theme({ params, searchParams }: Props) {
  const { id } = await params;
  const theme = themeList().find((t) => themeId(t) === id);
  if (!theme) notFound();
  const ctx = { from: "theme", group: theme };
  const rows = selection(ctx);
  const n = pageNumber(query(await searchParams).page, rows.length);
  return (
    <>
      <Crumbs
        items={[{ name: "Themes", href: "/themes" }, { name: pathName(theme) }]}
      />
      <h1>{pathName(theme)}</h1>
      <p className="index-total">{countLabel(rows.length)}</p>
      <GroundGroups rows={rows.slice((n - 1) * PAGE, n * PAGE)} ctx={ctx} />
      <Pager
        n={n}
        total={rows.length}
        link={(i) => url(themeUrl(theme), { page: String(i) })}
      />
    </>
  );
}
