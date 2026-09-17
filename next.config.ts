import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // During development Forge opens on its workspace; the client experience stays at /site. Production "/" is unchanged.
  async redirects() {
    return process.env.NODE_ENV === "production" ? [] : [{ source: "/", destination: "/forge", permanent: false }];
  },
  outputFileTracingIncludes: {
    "/api/asset-bank": ["./catalog/asset-bank/**/*.json", "./recipes/*.json"],
  },
  experimental: {
    optimizePackageImports: ["@react-three/drei", "@react-three/postprocessing", "gsap"],
  },
};

export default nextConfig;
