import type { NextConfig } from "next";

/**
 * Book covers live in Supabase Storage now, so next/image has to be told that
 * host is allowed. The hostname is read from the same env var the app uses,
 * which means a new Supabase project needs no code change — only a new value
 * in .env.local and in Vercel's environment variables.
 */
const supabaseHost = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Sell-form photos can be up to 4MB; Server Actions default to a 1MB
      // request cap, which would reject any real phone photo. 8mb leaves
      // room for the photo + multipart overhead + the other form fields.
      bodySizeLimit: "8mb",
    },
  },
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  async headers() {
    return [
      {
        // The service worker must be allowed to control the whole origin, and
        // must never be cached — a stale one strands users on an old build.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
