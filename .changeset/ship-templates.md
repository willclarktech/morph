---
"@morphdsl/generation-core": patch
---

Move `template/` directory from repo root into `@morphdsl/builder-scaffold`'s package and ship it in the npm tarball. The `new-project` command was failing on installs from npm with `ENOENT: template/monorepo/.editorconfig` because the templates weren't included in any published package.
