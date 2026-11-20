import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// The reference is meant to be found: full crawling allowed, sitemap named.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
