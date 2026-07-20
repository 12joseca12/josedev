import type { MetadataRoute } from "next";

// P4 SEO fix (H4): no robots.ts/robots.txt existed at all — crawlers had no
// sitemap declaration and no crawl-path hygiene for the private sections.
const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://josecoded.com").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/*/admin",
          "/*/admin/",
          "/*/closer",
          "/*/closer/",
          "/*/area-clientes",
          "/*/area-clientes/",
          "/*/staff",
          "/*/staff/",
          "/*/foro/new",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
