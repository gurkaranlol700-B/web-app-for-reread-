import type { MetadataRoute } from "next";

import { siteUrl } from "@/app/layout";
import { getCatalog } from "@/lib/store";

/**
 * Every book gets its own indexable page. That matters more than it sounds:
 * a student searching "DK Goel Class 11 second hand" is the cheapest customer
 * ReRead will ever acquire, and the listing page is what answers them.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/browse`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${siteUrl}/requests`, changeFrequency: "daily", priority: 0.7 },
    { url: `${siteUrl}/plus`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/advertise`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/leaderboard`, changeFrequency: "daily", priority: 0.5 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/signup`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  let books: MetadataRoute.Sitemap = [];
  try {
    const catalog = await getCatalog();
    books = catalog.map((book) => ({
      url: `${siteUrl}/books/${book.id}`,
      lastModified: book.createdAt ? new Date(book.createdAt) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // A database hiccup shouldn't take the whole sitemap down with it.
  }

  return [...staticPages, ...books];
}
