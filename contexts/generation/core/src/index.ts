// Generated main barrel

// Namespace exports for grouped imports
export * as ops from "./operations";

// Direct exports for individual imports
export * from "./layers";

// Pure functions (no declared errors) — bundler tree-shakes the
// Layer machinery so client packages can call these directly.
export { init } from "./operations/init/impl";

// Prose fixtures
export * from "./prose";
