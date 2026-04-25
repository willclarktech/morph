/**
 * Rewrite `workspace:*` deps for `@morphdsl/*` packages to a concrete version.
 *
 * Used in two places:
 * - At publish time (`scripts/rewrite-workspace-deps.ts`) to fix up
 *   morph's own apps before `npm publish`.
 * - At generation time (`contexts/generation/impls/src/generate.ts`) so
 *   projects produced by `bunx @morphdsl/cli new-project ...` reference
 *   the published @morphdsl/* versions, not unresolvable workspace:*.
 *
 * Only @morphdsl/* keys are rewritten. Project-internal workspace deps
 * (e.g. `@todo/pastes-dsl: workspace:*`) stay as-is — they remain valid
 * inside the generated monorepo.
 */

const SCOPE = "@morphdsl/";

export const rewriteMorphdslWorkspaceDeps = (
	deps: Record<string, string> | undefined,
	version: string,
): { changed: boolean; deps: Record<string, string> | undefined } => {
	if (!deps) return { changed: false, deps };
	let changed = false;
	const next: Record<string, string> = { ...deps };
	for (const [name, range] of Object.entries(next)) {
		if (!name.startsWith(SCOPE)) continue;
		if (range === "workspace:*" || range.startsWith("workspace:")) {
			next[name] = version;
			changed = true;
		}
	}
	return { changed, deps: next };
};

interface PackageJson {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
}

/**
 * Rewrite `workspace:*` deps for `@morphdsl/*` packages in a parsed package.json.
 * Returns the original object reference (mutated) and whether any changes were made.
 */
export const rewriteMorphdslDepsInPackage = (
	package_: PackageJson,
	version: string,
): boolean => {
	const deps = rewriteMorphdslWorkspaceDeps(package_.dependencies, version);
	const devDeps = rewriteMorphdslWorkspaceDeps(
		package_.devDependencies,
		version,
	);
	const peerDeps = rewriteMorphdslWorkspaceDeps(
		package_.peerDependencies,
		version,
	);
	if (deps.changed && deps.deps) package_.dependencies = deps.deps;
	if (devDeps.changed && devDeps.deps) package_.devDependencies = devDeps.deps;
	if (peerDeps.changed && peerDeps.deps)
		package_.peerDependencies = peerDeps.deps;
	return deps.changed || devDeps.changed || peerDeps.changed;
};
