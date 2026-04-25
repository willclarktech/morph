---
"@morphdsl/generation-core": patch
---

Change CLI and MCP entrypoint shebangs from `#!/usr/bin/env node` to `#!/usr/bin/env bun`. The runtime imports `bun` and `bun:sqlite` modules which are not available under node, so the bin scripts must be executed by bun. Users need bun installed (`curl -fsSL https://bun.com/install | bash`) to run `bunx @morphdsl/cli` or `bunx @morphdsl/mcp`.
