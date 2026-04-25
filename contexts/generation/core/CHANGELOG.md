# @morphdsl/generation-core

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
