import { buildPackageJson } from "@morphdsl/builder-app";

export const generateClientPackageJson = (
	name: string,
	dslPackages: readonly string[],
	corePackage: string,
	npmScope?: string,
	/**
	 * Core packages that the client re-exports bundled pure functions from.
	 * These need to be runtime deps (not devDeps) so consumers get them.
	 * The primary `corePackage` stays in devDeps for the scenario runner
	 * unless it's also in this list.
	 */
	bundledCorePackages: readonly string[] = [],
): string => {
	const scope = npmScope ?? name;
	const dslDependencies: Record<string, string> = {};
	for (const pkg of dslPackages) {
		dslDependencies[pkg] = "workspace:*";
	}
	const bundledCoreDeps: Record<string, string> = {};
	for (const pkg of bundledCorePackages) {
		bundledCoreDeps[pkg] = "workspace:*";
	}
	const bundledSet = new Set(bundledCorePackages);
	// If the primary core package is also bundled, omit it from devDeps so we
	// don't have duplicate dep entries.
	const corePackageDevDeps = bundledSet.has(corePackage)
		? {}
		: { [corePackage]: "workspace:*" };
	return buildPackageJson({
		projectName: name,
		packageSuffix: "client",
		dependencies: {
			"@morphdsl/http-client": "workspace:*",
			...dslDependencies,
			...bundledCoreDeps,
		},
		devDependencies: {
			"@morphdsl/scenario-runner-client": "workspace:*",
			...corePackageDevDeps,
			[`@${scope}/scenarios`]: "workspace:*",
		},
		exports: { ".": "./src/index.ts" },
		includeEffect: true,
		includeTestScript: true,
		publishable: true,
		...(npmScope ? { metadata: { npmScope } } : {}),
	});
};
