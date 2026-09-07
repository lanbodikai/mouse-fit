import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: 'standalone',
  // Prevent Next from inferring an incorrect workspace root when extra lockfiles exist.
  outputFileTracingRoot: process.cwd(),
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/database",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    const backendInternalUrl = (process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
    return [
      {
        source: "/backend-api/:path*",
        destination: `${backendInternalUrl}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/videos/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/projects/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Public JS tools are not content-hashed; cache briefly to avoid stale deployments.
      {
        source: "/src/js/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
});
