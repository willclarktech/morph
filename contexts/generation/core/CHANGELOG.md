# @morphdsl/generation-core

## 0.1.7

### Patch Changes

- [`2fb01b9`](https://github.com/willclarktech/morph/commit/2fb01b9e888149beb4c22d80728103fea5f6e60b) Thanks [@willclarktech](https://github.com/willclarktech)! - Rewrite `workspace:*` references for `@morphdsl/*` deps to concrete versions in `executeGenerate` output. Generated projects now get installable package.json files (e.g. `"@morphdsl/runtime-cli": "0.1.6"` instead of `"workspace:*"`). Project-internal workspace deps (e.g. `@todo/pastes-dsl`) keep `workspace:*`. Morph's own self-regeneration opts out via `preserveWorkspaceDeps: true` so its workspace setup is unchanged.

- Updated dependencies []:
  - @morphdsl/generation-dsl@0.1.7
  - @morphdsl/generation-impls@0.1.7
  - @morphdsl/operation@0.1.7
  - @morphdsl/testing@0.1.7

## 0.1.6

### Patch Changes

- [`cffd5a1`](https://github.com/willclarktech/morph/commit/cffd5a16535491fd5a62f0572d927394a221e7c6) Thanks [@willclarktech](https://github.com/willclarktech)! - Use `_`-prefixed template filenames (`_editorconfig`, `_gitignore`, `_github/`) in `@morphdsl/builder-scaffold` and rename them to `.`-prefixed on output. npm strips dotfiles when packaging based on `.gitignore` defaults, so the previous publish was missing `.editorconfig`, `.gitignore`, and `.github/workflows/ci.yml`, causing `new-project` to fail with `ENOENT`.

- Updated dependencies []:
  - @morphdsl/generation-dsl@0.1.6
  - @morphdsl/generation-impls@0.1.6
  - @morphdsl/operation@0.1.6
  - @morphdsl/testing@0.1.6

## 0.1.5

### Patch Changes

- [`ae432f2`](https://github.com/willclarktech/morph/commit/ae432f2eeb44c5b81f064a0f3120eb74079f5592) Thanks [@willclarktech](https://github.com/willclarktech)! - Move `template/` directory from repo root into `@morphdsl/builder-scaffold`'s package and ship it in the npm tarball. The `new-project` command was failing on installs from npm with `ENOENT: template/monorepo/.editorconfig` because the templates weren't included in any published package.

- Updated dependencies []:
  - @morphdsl/generation-dsl@0.1.5
  - @morphdsl/generation-impls@0.1.5
  - @morphdsl/operation@0.1.5
  - @morphdsl/testing@0.1.5

## 0.1.4

### Patch Changes

- [`7263a63`](https://github.com/willclarktech/morph/commit/7263a63c47ef4e95812451a165659fd876373c45) Thanks [@willclarktech](https://github.com/willclarktech)! - Change CLI and MCP entrypoint shebangs from `#!/usr/bin/env node` to `#!/usr/bin/env bun`. The runtime imports `bun` and `bun:sqlite` modules which are not available under node, so the bin scripts must be executed by bun. Users need bun installed (`curl -fsSL https://bun.com/install | bash`) to run `bunx @morphdsl/cli` or `bunx @morphdsl/mcp`.

- Updated dependencies []:
  - @morphdsl/generation-dsl@0.1.4
  - @morphdsl/generation-impls@0.1.4
  - @morphdsl/operation@0.1.4
  - @morphdsl/testing@0.1.4

## 0.1.3

### Patch Changes

- [`b00c5b3`](https://github.com/willclarktech/morph/commit/b00c5b32918a690dae90ce281064347cfca13e17) Thanks [@willclarktech](https://github.com/willclarktech)! - Fix published `exports` field to point to compiled `dist/` instead of source `src/`. Earlier 0.1.2 publish had `exports` pointing to `./src/index.ts` (which isn't shipped), so importers got `ERR_MODULE_NOT_FOUND`. The rewrite-workspace-deps script now also overlays `publishConfig.exports` onto the top-level `exports` field, mirroring what pnpm/bun publish does natively.

- Updated dependencies []:
  - @morphdsl/generation-dsl@0.1.3
  - @morphdsl/generation-impls@0.1.3
  - @morphdsl/operation@0.1.3
  - @morphdsl/testing@0.1.3

## 0.1.2

### Patch Changes

- [`1461d07`](https://github.com/willclarktech/morph/commit/1461d07ab27672b235dfa1fd1351dee5758a58e8) Thanks [@willclarktech](https://github.com/willclarktech)! - Fix published packages to resolve `workspace:*` dependency references to actual versions. Earlier 0.1.0 and 0.1.1 publishes shipped with `workspace:*` literally in their `dependencies`, making them uninstallable from npm.

- Updated dependencies []:
  - @morphdsl/generation-dsl@0.1.2
  - @morphdsl/generation-impls@0.1.2
  - @morphdsl/operation@0.1.2
  - @morphdsl/testing@0.1.2

## 0.1.1

### Patch Changes

- [`05febfe`](https://github.com/willclarktech/morph/commit/05febfe7379d514951cbda2319ea7119c485615e) Thanks [@willclarktech](https://github.com/willclarktech)! - Fix VSCode extension publisher ID to match Marketplace publisher (morphdsl)

- Updated dependencies []:
  - @morphdsl/generation-dsl@0.1.1
  - @morphdsl/generation-impls@0.1.1
  - @morphdsl/operation@0.1.1
  - @morphdsl/testing@0.1.1

## 0.1.0

### Minor Changes

- [`bec8c7e`](https://github.com/willclarktech/morph/commit/bec8c7e1d8b57eaf2850190a96afeb41ae03393e) Thanks [@willclarktech](https://github.com/willclarktech)! - Initial release of the Morph DSL generation framework

### Patch Changes

- Updated dependencies []:
  - @morphdsl/generation-dsl@0.1.0
  - @morphdsl/generation-impls@0.1.0
  - @morphdsl/operation@0.1.0
  - @morphdsl/testing@0.1.0
