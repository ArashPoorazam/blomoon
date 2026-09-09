import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async headers() {
    return [{ source: "/sw.js", headers: [
      { key: "Content-Type", value: "application/javascript; charset=utf-8" },
      // Never let a CDN's browser-TTL minimum delay service-worker updates.
      { key: "Cache-Control", value: "private, no-store, no-cache, max-age=0, must-revalidate" },
      { key: "Cloudflare-CDN-Cache-Control", value: "no-store" },
      { key: "X-Content-Type-Options", value: "nosniff" }
    ] }];
  }
};

export default nextConfig;
