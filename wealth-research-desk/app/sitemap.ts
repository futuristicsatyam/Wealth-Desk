import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/env";
import { LEGAL_SLUGS } from "@/lib/legal";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/about", "/membership", "/performance", "/faq", "/contact", "/login", "/register"];
  const legalRoutes = LEGAL_SLUGS.map((slug) => `/legal/${slug}`);

  return [...staticRoutes, ...legalRoutes].map((route) => ({
    url: `${APP_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7
  }));
}
