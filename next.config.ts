import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Sell-form photos can be up to 5MB; Server Actions default to a 1MB
      // request cap, which would reject any real phone photo. 8mb leaves
      // room for the photo + multipart overhead + the other form fields.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
