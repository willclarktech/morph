---
"@morphdsl/generation-core": patch
---

Apply `workspace:*` rewriting to scaffold output in `new-project`. The previous fix only post-processed files coming from `executeGenerate`; the scaffold step (which writes `config/eslint/package.json` from a template) was bypassing it, leaving `@morphdsl/eslint-config: workspace:*` unresolvable on `bun install` in generated projects.
