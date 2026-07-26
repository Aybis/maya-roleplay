// `cloudflare:workers` is a runtime-provided virtual module (injected by wrangler /
// the Workers runtime) with no published type declarations in this repo. `db/index.ts`
// imports it directly; without this ambient declaration, `tsc` (as run by `next build`
// on Vercel) fails with "Cannot find module 'cloudflare:workers'" even though the
// wrangler-based build never runs a type-check and so never surfaces it.
declare module "cloudflare:workers" {
  export const env: Record<string, any>;
}
