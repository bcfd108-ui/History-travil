import { CatalogBrowse } from "@/components/Browse";
import { inState, query, stateUrl, type RawQuery } from "@/lib/browse";
type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<RawQuery>;
};
export async function generateMetadata({ params }: Props) {
  const { code } = await params;
  return {
    title: (inState(code)[0]?.state || "State") + " — On Old Ground",
    alternates: { canonical: stateUrl(code) },
  };
}
export default async function StatePage({ params, searchParams }: Props) {
  return (
    <CatalogBrowse
      code={(await params).code.toUpperCase()}
      p={query(await searchParams)}
    />
  );
}
