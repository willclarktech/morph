# VSCode Extension

Generates a VSCode extension with TextMate syntax highlighting for `.morph` files and commands for schema operations.

## What It Generates

| File | Purpose |
|------|---------|
| `src/extension.ts` | Extension activation and command registration |
| `package.json` | Extension manifest with contributions (languages, grammars, commands) |
| `esbuild.config.ts` | Extension build configuration |
| `.vscodeignore` | Files excluded from the VSIX package |

## Schema Triggers

- **Tag:** `@vscode` — operations tagged `@vscode` become extension commands
- **Language providers:** operations matching known provider names (`getDiagnostics`, `getSymbols`, `getCompletions`, `getHover`, `getDefinition`, `formatDsl`, `getFoldingRanges`) register as VSCode language features instead of commands

## Example

### Generated Output

**package.json** (contributions excerpt):

```json
{
  "contributes": {
    "languages": [{
      "id": "morph",
      "extensions": [".morph"],
      "aliases": ["Morph", "morph"]
    }],
    "grammars": [{
      "language": "morph",
      "scopeName": "source.morph",
      "path": "./syntaxes/morph.tmLanguage.json"
    }],
    "commands": [
      { "command": "morph.generate", "title": "Morph: Generate" }
    ]
  }
}
```

### Building

```bash
cd apps/vscode && bun run build     # Build the extension
cd apps/vscode && bun run package   # Package as .vsix
```
