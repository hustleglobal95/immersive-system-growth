import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/api/asset-bank": ["./catalog/asset-bank/**/*.json", "./recipes/*.json"],
  },
  experimental: {
    optimizePackageImports: ["@react-three/drei", "@react-three/postprocessing", "gsap"],
  },
};

export default nextConfig;
