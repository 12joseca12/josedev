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
        // P4 SEO review fix: bare prefixes like "/*/admin" (no `$`) are
        // unanchored substring-prefix matches — "/*/admin" also matches
        // "/es/administracion". Section roots now use `$` (exact match) plus
        // a trailing-slash pattern (subtree match) instead of one ambiguous
        // bare-prefix entry. "/*/foro/new" is a single page (no children),
        // so it gets a `$` anchor only — without it, it also matched
        // "/es/foro/newsletter-tips" or any future slug starting with "new".
        disallow: [
          "/*/admin$",
          "/*/admin/",
          "/*/closer$",
          "/*/closer/",
          "/*/area-clientes$",
          "/*/area-clientes/",
          "/*/staff$",
          "/*/staff/",
          "/*/foro/new$",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
