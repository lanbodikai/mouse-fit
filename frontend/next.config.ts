import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: 'standalone',
  // Prevent Next from inferring an incorrect workspace root when extra lockfiles exist.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
