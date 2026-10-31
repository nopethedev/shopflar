import type { NextConfig } from "next";

// NOTE: `output: "standalone"` is intentionally NOT set — the standard
// deployment flow is `npm run build` + `npm run start` (next start), and
// Next.js 16 refuses to start with `next start` when standalone output is
// enabled. If you deploy with Docker and need a standalone server bundle,
// set `output: "standalone"` back and run `node .next/standalone/server.js`.
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
