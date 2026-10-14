import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Only the home page is indexable. Room URLs (/ABC123, /create) are private,
// per-session pages and are marked noindex instead.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/`, priority: 1 }];
}
