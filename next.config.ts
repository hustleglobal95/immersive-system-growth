import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["@react-three/drei", "@react-three/postprocessing", "gsap"],
  },
};

export default nextConfig;
