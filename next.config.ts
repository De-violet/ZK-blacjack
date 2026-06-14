import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true, // Enable strict mode for better error detection
  // typescript.ignoreBuildErrors intentionally removed so TS errors surface during build
};

export default nextConfig;
