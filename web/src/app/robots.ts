import type { MetadataRoute } from "next";

/**
 * Everything on the site is public information about public officials; there
 * is nothing to hide from any crawler, search engine or AI assistant alike.
 * `public/llms.txt` gives assistants the same orientation in prose.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://quinousrepresente.fr/sitemap.xml",
  };
}
