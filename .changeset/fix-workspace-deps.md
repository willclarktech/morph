---
"@morphdsl/generation-core": patch
---

Fix published packages to resolve `workspace:*` dependency references to actual versions. Earlier 0.1.0 and 0.1.1 publishes shipped with `workspace:*` literally in their `dependencies`, making them uninstallable from npm.
