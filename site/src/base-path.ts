// Base path under which the site is served.
// Empty for local dev (served at /), "/morph" for production deploy at willclark.tech/morph.
// Set via BASE_PATH env var at build time.
export const BASE_PATH = (Bun.env["BASE_PATH"] ?? "").replace(/\/$/, "");

// Prepend BASE_PATH to a root-absolute URL path.
// Example: url("/docs") → "/morph/docs" in prod, "/docs" in dev.
export const url = (p: string): string => `${BASE_PATH}${p}`;
