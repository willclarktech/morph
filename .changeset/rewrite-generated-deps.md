---
"@morphdsl/generation-core": patch
---

Rewrite `workspace:*` references for `@morphdsl/*` deps to concrete versions in `executeGenerate` output. Generated projects now get installable package.json files (e.g. `"@morphdsl/runtime-cli": "0.1.6"` instead of `"workspace:*"`). Project-internal workspace deps (e.g. `@todo/pastes-dsl`) keep `workspace:*`. Morph's own self-regeneration opts out via `preserveWorkspaceDeps: true` so its workspace setup is unchanged.
