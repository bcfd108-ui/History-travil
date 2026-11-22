import { notFound } from "next/navigation";
import SiteArticle from "@/components/SiteArticle";
import { getPublicTitle, getSite, getSites } from "@/lib/data";
import { entryDescription, entryUrl, SITE_NAME } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getSites().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = getSite(slug);
  if (!site) return { title: SITE_NAME };
  const title = `${getPublicTitle(site.slug).name} — ${SITE_NAME}`;
  const description = entryDescription(site);
  return {
    title,
    description,
    alternates: { canonical: `/sites/${site.slug}` },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      title,
      description,
      url: entryUrl(site),
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function SitePage({params}:{params:Promise<{slug:string}>}) {
  const site=getSite((await params).slug);
  if (!site) notFound();
  return <SiteArticle site={site}/>;
}
