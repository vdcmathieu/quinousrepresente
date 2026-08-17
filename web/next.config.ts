import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Every page is generated at build time from data/site/*.json.
  // Remote AN portraits are only a fallback for deputies without a local file,
  // and are served straight from the AN origin (no optimisation round-trip).
  images: { unoptimized: true },
};

export default nextConfig;
