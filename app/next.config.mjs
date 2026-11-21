/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Let the post-deploy notifier identify which build served this sitemap,
  // including content-only releases with exactly the same URLs.
  async headers() {
    const revision = process.env.VERCEL_GIT_COMMIT_SHA;
    if (!revision) return [];
    return [{
      source: "/sitemap.xml",
      headers: [{ key: "X-On-Old-Ground-Revision", value: revision }],
    }];
  },
  // Plain dossier links keep their static pages. Contextual links use the
  // same article with server-rendered breadcrumbs and adjacent entries.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/sites/:slug",
          has: [{ type: "query", key: "from" }],
          destination: "/reading/:slug",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  outputFileTracingIncludes: {
    "/*": ["./data/*.json"],
  },
};
export default nextConfig;
