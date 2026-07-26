import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Vercel's edge-function build step statically scans compiled bundles for
    // unsupported module specifiers and fails the deploy if it finds one --
    // even when the import (db/index.ts's D1 branch) never runs there. Only the
    // Cloudflare/wrangler build (vinext build) needs the real `cloudflare:workers`
    // binding; on Vercel (process.env.VERCEL is set during platform builds) alias
    // it to a stub module so the specifier never reaches the bundled output.
    resolveAlias: process.env.VERCEL
      ? { "cloudflare:workers": "./lib/cloudflare-workers-stub.ts" }
      : {},
  },
};

export default nextConfig;
