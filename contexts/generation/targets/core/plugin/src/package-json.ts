import type { ContextCoreInfo } from "./info";
import { toPackageScope } from "./info";
import { buildPackageJson } from "@morphdsl/builder-app";

export const generateCorePackageJson = (
	projectName: string,
	info: ContextCoreInfo,
	dslPackage: string,
	needsFastCheck: boolean,
	authProviders: readonly string[],
	storageBackends: readonly string[],
	eventStoreBackends: readonly string[],
	hasPropertyTests: boolean,
	hasScenarioTests: boolean,
	npmScope?: string,
): string => {
	const scope = toPackageScope(projectName, npmScope);
	const scenariosPackage = `@${scope}/scenarios`;
	const propertiesPackage = `@${scope}/properties`;
	const hasAnyTests = hasPropertyTests || hasScenarioTests;

	// Auth adapter dependencies based on configured providers
	// Only needed for contexts with entities (where auth services are generated)
	const authDeps: Record<string, string> = {};
	if (info.hasEntities && authProviders.length > 0) {
		// Always need auth-dsl for error types and AuthService interface
		authDeps["@morphdsl/auth-dsl"] = "workspace:*";

		if (authProviders.includes("jwt")) {
			authDeps["@morphdsl/auth-jwt-impls"] = "workspace:*";
		}
		if (authProviders.includes("session")) {
			authDeps["@morphdsl/auth-session-impls"] = "workspace:*";
		}
		if (authProviders.includes("apikey")) {
			authDeps["@morphdsl/auth-apikey-impls"] = "workspace:*";
		}
	}

	// Storage adapter dependencies based on configured backends
	const storageDeps: Record<string, string> = {};
	if (info.hasEntities && storageBackends.length > 0) {
		storageDeps["@morphdsl/storage-dsl"] = "workspace:*";
		storageDeps["@morphdsl/storage-impls"] = "workspace:*";

		if (storageBackends.includes("memory"))
			storageDeps["@morphdsl/storage-memory-impls"] = "workspace:*";
		if (storageBackends.includes("jsonfile"))
			storageDeps["@morphdsl/storage-jsonfile-impls"] = "workspace:*";
		if (storageBackends.includes("sqlite"))
			storageDeps["@morphdsl/storage-sqlite-impls"] = "workspace:*";
		if (storageBackends.includes("redis"))
			storageDeps["@morphdsl/storage-redis-impls"] = "workspace:*";
		if (storageBackends.includes("eventsourced")) {
			storageDeps["@morphdsl/storage-eventsourced-impls"] = "workspace:*";
			// Eventsourced storage depends on eventstore transport
			storageDeps["@morphdsl/eventstore-dsl"] = "workspace:*";
		}
	}

	// Event store adapter dependencies based on configured backends
	const eventStoreDeps: Record<string, string> = {};
	if (info.hasEntities && eventStoreBackends.length > 0) {
		eventStoreDeps["@morphdsl/eventstore-dsl"] = "workspace:*";
		eventStoreDeps["@morphdsl/eventstore-impls"] = "workspace:*";

		if (eventStoreBackends.includes("memory"))
			eventStoreDeps["@morphdsl/eventstore-memory-impls"] = "workspace:*";
		if (eventStoreBackends.includes("jsonfile"))
			eventStoreDeps["@morphdsl/eventstore-jsonfile-impls"] = "workspace:*";
		if (eventStoreBackends.includes("redis"))
			eventStoreDeps["@morphdsl/eventstore-redis-impls"] = "workspace:*";
	}

	// @morphdsl/utils is only needed when storage adapters are generated (they use jsonParse/jsonStringify)
	const utilsDeps: Record<string, string> =
		info.hasEntities && storageBackends.length > 0
			? { "@morphdsl/utils": "workspace:*" }
			: {};

	return buildPackageJson({
		projectName,
		packageSuffix: `${info.kebabName}-core`,
		dependencies: {
			"@morphdsl/operation": "workspace:*",
			"@morphdsl/testing": "workspace:*",
			...utilsDeps,
			[dslPackage]: "workspace:*",
			...authDeps,
			...storageDeps,
			...eventStoreDeps,
		},
		devDependencies: {
			...(hasScenarioTests
				? {
						"@morphdsl/scenario-runner-core": "workspace:*",
						[scenariosPackage]: "workspace:*",
					}
				: {}),
			...(hasPropertyTests
				? {
						"@morphdsl/property-runner-core": "workspace:*",
						[propertiesPackage]: "workspace:*",
					}
				: {}),
		},
		exports: { ".": "./src/index.ts" },
		includeEffect: true,
		includeFastCheck: needsFastCheck ? "devDependencies" : undefined,
		includeTestScript: hasAnyTests,
		...(npmScope ? { metadata: { npmScope } } : {}),
	});
};
