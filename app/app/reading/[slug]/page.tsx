import { notFound } from "next/navigation";
import SiteArticle from "@/components/SiteArticle";
import { getSite } from "@/lib/data";
import { query, type RawQuery } from "@/lib/browse";
export { generateMetadata } from "../../sites/[slug]/page";

export default async function ReadingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawQuery>;
}) {
  const site = getSite((await params).slug);
  if (!site) notFound();
  return <SiteArticle site={site} context={query(await searchParams)} />;
}
