---
"@morphdsl/generation-core": patch
---

Fix published `exports` field to point to compiled `dist/` instead of source `src/`. Earlier 0.1.2 publish had `exports` pointing to `./src/index.ts` (which isn't shipped), so importers got `ERR_MODULE_NOT_FOUND`. The rewrite-workspace-deps script now also overlays `publishConfig.exports` onto the top-level `exports` field, mirroring what pnpm/bun publish does natively.
