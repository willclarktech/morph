import type { ContextCoreInfo } from "./info";
import { toPackageScope } from "./info";
import { buildPackageJson } from "@morph/builder-app";

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
): string => {
	const scope = toPackageScope(projectName);
	const scenariosPackage = `@${scope}/scenarios`;
	const propertiesPackage = `@${scope}/properties`;
	const hasAnyTests = hasPropertyTests || hasScenarioTests;

	// Auth adapter dependencies based on configured providers
	// Only needed for contexts with entities (where auth services are generated)
	const authDeps: Record<string, string> = {};
	if (info.hasEntities && authProviders.length > 0) {
		// Always need auth-dsl for error types and AuthService interface
		authDeps["@morph/auth-dsl"] = "workspace:*";

		if (authProviders.includes("jwt")) {
			authDeps["@morph/auth-jwt-impls"] = "workspace:*";
		}
		if (authProviders.includes("session")) {
			authDeps["@morph/auth-session-impls"] = "workspace:*";
		}
		if (authProviders.includes("apikey")) {
			authDeps["@morph/auth-apikey-impls"] = "workspace:*";
		}
	}

	// Storage adapter dependencies based on configured backends
	const storageDeps: Record<string, string> = {};
	if (info.hasEntities && storageBackends.length > 0) {
		storageDeps["@morph/storage-dsl"] = "workspace:*";
		storageDeps["@morph/storage-impls"] = "workspace:*";

		if (storageBackends.includes("memory"))
			storageDeps["@morph/storage-memory-impls"] = "workspace:*";
		if (storageBackends.includes("jsonfile"))
			storageDeps["@morph/storage-jsonfile-impls"] = "workspace:*";
		if (storageBackends.includes("sqlite"))
			storageDeps["@morph/storage-sqlite-impls"] = "workspace:*";
		if (storageBackends.includes("redis"))
			storageDeps["@morph/storage-redis-impls"] = "workspace:*";
		if (storageBackends.includes("eventsourced")) {
			storageDeps["@morph/storage-eventsourced-impls"] = "workspace:*";
			// Eventsourced storage depends on eventstore transport
			storageDeps["@morph/eventstore-dsl"] = "workspace:*";
		}
	}

	// Event store adapter dependencies based on configured backends
	const eventStoreDeps: Record<string, string> = {};
	if (info.hasEntities && eventStoreBackends.length > 0) {
		eventStoreDeps["@morph/eventstore-dsl"] = "workspace:*";
		eventStoreDeps["@morph/eventstore-impls"] = "workspace:*";

		if (eventStoreBackends.includes("memory"))
			eventStoreDeps["@morph/eventstore-memory-impls"] = "workspace:*";
		if (eventStoreBackends.includes("jsonfile"))
			eventStoreDeps["@morph/eventstore-jsonfile-impls"] = "workspace:*";
		if (eventStoreBackends.includes("redis"))
			eventStoreDeps["@morph/eventstore-redis-impls"] = "workspace:*";
	}

	return buildPackageJson({
		projectName,
		packageSuffix: `${info.kebabName}-core`,
		dependencies: {
			"@morph/operation": "workspace:*",
			"@morph/testing": "workspace:*",
			"@morph/utils": "workspace:*",
			[dslPackage]: "workspace:*",
			...authDeps,
			...storageDeps,
			...eventStoreDeps,
		},
		devDependencies: {
			...(hasScenarioTests
				? {
						"@morph/scenario-runner-core": "workspace:*",
						[scenariosPackage]: "workspace:*",
					}
				: {}),
			...(hasPropertyTests
				? {
						"@morph/property-runner-core": "workspace:*",
						[propertiesPackage]: "workspace:*",
					}
				: {}),
		},
		exports: { ".": "./src/index.ts" },
		includeEffect: true,
		includeFastCheck: needsFastCheck ? "devDependencies" : undefined,
		includeTestScript: hasAnyTests,
	});
};
