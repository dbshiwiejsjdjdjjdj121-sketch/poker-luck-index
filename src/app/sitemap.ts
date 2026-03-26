import type { MetadataRoute } from "next";
import { buildAbsoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: buildAbsoluteUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: buildAbsoluteUrl("/bankroll"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: buildAbsoluteUrl("/hand-review"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.85,
    },
  ];
}
