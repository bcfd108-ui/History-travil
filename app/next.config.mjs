/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
