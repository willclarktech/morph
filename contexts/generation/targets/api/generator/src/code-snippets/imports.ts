import type { DetectedFeatures } from "../feature-detection";

/**
 * Build core package imports based on detected features.
 */
export const buildCoreImports = (
	features: DetectedFeatures,
): readonly string[] => {
	const imports: string[] = [];

	imports.push("HandlersLayer", "ops");

	if (features.hasEntities) {
		imports.push("resolveStorage");
	}

	if (features.hasEvents) {
		imports.push("resolveEventStore");
	}

	if (features.hasSubscribers) {
		imports.push(
			"EventEmitterInMemory",
			"EventSubscriberRegistry",
			"SubscribersLive",
			"SubscriberBootstrap",
		);
	}

	if (features.hasSseWiring) {
		imports.push("EventSubscriber");
	}

	if (features.authEntity && features.createUserCmd) {
		imports.push(`${features.authEntity.entityName}Repository`);
	}

	if (features.hasAuth) {
		imports.push("AuthService");
	}

	return imports;
};

/**
 * Build auth-related imports.
 */
export const buildAuthImports = (
	features: DetectedFeatures,
	dslPath: string,
): {
	authImport: string;
	passwordAuthImport: string;
	sseImport: string;
} => ({
	authImport: features.hasAuth
		? `import { createSimpleBearerStrategy } from "@morph/runtime-api";
`
		: "",
	passwordAuthImport:
		features.authEntity && features.createUserCmd
			? `import { verifyPassword } from "@morph/auth-password-impls";
import type { ${features.authEntity.entityName} } from "${dslPath}";
`
			: "",
	sseImport: features.hasEvents
		? `import { createSseManager, wireEventsToSse } from "@morph/runtime-api";
`
		: "",
});
