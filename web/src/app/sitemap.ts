import type { MetadataRoute } from "next";
import { getDeputes, getGroupes, groupeSlug, SITE_URL as BASE } from "@/lib/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const fixes = [
    "",
    "/deputes",
    "/groupes",
    "/statistiques",
    "/methode",
    "/mentions-legales",
  ].map((p) => ({
    url: `${BASE}${p}`,
    priority: p === "" ? 1 : p === "/mentions-legales" ? 0.2 : 0.8,
  }));
  const groupes = getGroupes().map((g) => ({
    url: `${BASE}/groupes/${groupeSlug(g.abbrev)}`,
    priority: 0.6,
  }));
  const deputes = getDeputes().map((d) => ({
    url: `${BASE}/deputes/${d.slug}`,
    priority: 0.5,
  }));
  return [...fixes, ...groupes, ...deputes];
}
