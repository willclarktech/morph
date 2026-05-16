// Generated main barrel

// Namespace exports for grouped imports
export * as ops from "./operations";

// Direct exports for individual imports
export * from "./layers";

// Pure functions (no declared errors) — bundler tree-shakes the
// Layer machinery so client packages can call these directly.
export { getCompletions } from "./operations/get-completions/impl";
export { getDefinition } from "./operations/get-definition/impl";
export { getDiagnostics } from "./operations/get-diagnostics/impl";
export { getFoldingRanges } from "./operations/get-folding-ranges/impl";
export { getHover } from "./operations/get-hover/impl";
export { getSymbols } from "./operations/get-symbols/impl";
export { templateSchema } from "./operations/template-schema/impl";

// Prose fixtures
export * from "./prose";

// Grammar fixtures
export * from "./grammar";
