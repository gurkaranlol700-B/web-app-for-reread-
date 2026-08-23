import type { MetadataRoute } from "next";

import { siteUrl } from "@/app/layout";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private or pointless-to-index surfaces. These are all session-gated
      // anyway; excluding them keeps crawl budget on the listings that can
      // actually bring a student in.
      disallow: [
        "/api/",
        "/admin",
        "/profile",
        "/messages",
        "/orders",
        "/wishlist",
        "/advertise/dashboard",
        "/advertise/pay/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
