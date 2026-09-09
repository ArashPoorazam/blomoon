import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async headers() {
    return [{ source: "/sw.js", headers: [
      { key: "Content-Type", value: "application/javascript; charset=utf-8" },
      { key: "Cache-Control", value: "no-cache, max-age=0, must-revalidate" },
      { key: "X-Content-Type-Options", value: "nosniff" }
    ] }];
  }
};

export default nextConfig;
