import { redirect } from "next/navigation";
import { CatalogBrowse } from "@/components/Browse";
import CatalogSearch from "@/components/CatalogSearch";
import {
  normalizeTheme,
  query,
  stateUrl,
  themeUrl,
  url,
  type RawQuery,
} from "@/lib/browse";
export const metadata = {
  title: "Catalog — On Old Ground",
  alternates: { canonical: "/catalog" },
};
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<RawQuery>;
}) {
  const p = query(await searchParams);
  if (p.q?.trim()) return <CatalogSearch p={p} />;
  if (p.state)
    redirect(
      url(
        stateUrl(p.state),
        p.theme
          ? { view: "theme", group: normalizeTheme(p.theme) }
          : { view: p.view, group: p.group, page: p.page },
      ),
    );
  if (p.theme) redirect(themeUrl(normalizeTheme(p.theme)));
  return <CatalogBrowse p={p} />;
}
