---
"@morphdsl/generation-core": patch
---

Make `new-project` produce a project that passes `bun install && bun run build:check` end-to-end:

- Always write the parsed schema as `schema.json` (generated TS files import from `../../../../schema.json` regardless of source format; the previous behavior wrote either `.morph` OR `.json`, not both).
- Wire prose re-exports for each context: DSL `index.ts` re-exports its `prose.ts`, core gets a `prose.ts` shim re-exporting from the DSL package, and core `index.ts` re-exports prose. Matches what `scripts/generate-examples.ts` already did for the bundled examples.
- Add `@types/bun` to the generated monorepo's root `devDependencies` so `tsc` finds globals like `process`, `console`, `node:crypto`.
