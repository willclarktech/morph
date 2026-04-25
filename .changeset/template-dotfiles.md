---
"@morphdsl/generation-core": patch
---

Use `_`-prefixed template filenames (`_editorconfig`, `_gitignore`, `_github/`) in `@morphdsl/builder-scaffold` and rename them to `.`-prefixed on output. npm strips dotfiles when packaging based on `.gitignore` defaults, so the previous publish was missing `.editorconfig`, `.gitignore`, and `.github/workflows/ci.yml`, causing `new-project` to fail with `ENOENT`.
