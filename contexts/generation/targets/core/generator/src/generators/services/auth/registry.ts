/**
 * Auth registry generator.
 * Generates runtime adapter selection using adapter context packages.
 */

import type { AuthProvider, GeneratedFile } from "@morphdsl/domain-schema";

/**
 * Generate the auth registry for runtime provider selection.
 * Adapters are provided by @morphdsl/auth-* context packages.
 */
export const generateAuthRegistry = (
	authProviders: readonly AuthProvider[],
	defaultProvider: AuthProvider,
): GeneratedFile => {
	// Build imports based on configured providers
	const imports: string[] = [];
	if (authProviders.includes("none")) {
		imports.push('import { AuthServiceNone } from "./auth-service-none";');
	}
	if (authProviders.includes("inmemory")) {
		imports.push(
			'import { AuthServiceInMemory, AuthStateInMemory } from "./auth-service-inmemory";',
		);
	}
	if (authProviders.includes("test")) {
		imports.push('import { makeAuthServiceTest } from "./auth-service-test";');
	}
	if (authProviders.includes("jwt")) {
		imports.push('import { AuthServiceJwt } from "./auth-service-jwt";');
	}
	if (authProviders.includes("session")) {
		imports.push(
			'import { AuthServiceSession } from "./auth-service-session";',
		);
	}
	if (authProviders.includes("apikey")) {
		imports.push('import { AuthServiceApiKey } from "./auth-service-apikey";');
	}

	// Build registry entries based on configured providers
	const registryEntries: string[] = [];
	if (authProviders.includes("none")) {
		registryEntries.push("\tnone: () => Effect.succeed(AuthServiceNone),");
	}
	if (authProviders.includes("inmemory")) {
		registryEntries.push(
			"\tinmemory: () => Effect.succeed(AuthServiceInMemory.pipe(Layer.provide(AuthStateInMemory))),",
		);
	}
	if (authProviders.includes("test")) {
		registryEntries.push(
			"\ttest: () => Effect.succeed(makeAuthServiceTest(undefined) as AuthLayer),",
		);
	}
	if (authProviders.includes("jwt")) {
		registryEntries.push("\tjwt: () => Effect.succeed(AuthServiceJwt),");
	}
	if (authProviders.includes("session")) {
		registryEntries.push(
			"\tsession: () => Effect.succeed(AuthServiceSession),",
		);
	}
	if (authProviders.includes("apikey")) {
		registryEntries.push("\tapikey: () => Effect.succeed(AuthServiceApiKey),");
	}

	const content = `// Auth registry for runtime adapter selection
// Adapters are provided by @morphdsl/auth-* context packages
// Do not edit - regenerate from schema

import { Data, Effect, Layer } from "effect";

import type { AuthService } from "./auth-service";

${imports.join("\n")}

/**
 * Error when auth adapter is unknown or unavailable.
 */
export class AuthSelectionError extends Data.TaggedError("AuthSelectionError")<{
	readonly provider: string;
	readonly message: string;
	readonly cause?: unknown;
}> {}

/**
 * Auth service layer type.
 */
export type AuthLayer = Layer.Layer<AuthService>;

/**
 * Factory function that creates an auth service layer.
 */
export type AuthFactory = () => Effect.Effect<AuthLayer, AuthSelectionError>;

/**
 * Registry mapping auth adapter names to layer factories.
 * Factories are lazy - layers are only created when selected.
 */
const registry: Record<string, AuthFactory> = {
${registryEntries.join("\n")}
};

/**
 * Available auth adapter names.
 */
export const availableAuthProviders = Object.keys(registry);

/**
 * Default auth adapter.
 */
export const defaultAuthProvider = "${defaultProvider}";

/**
 * Get an auth service layer by adapter name.
 * Returns an Effect that fails with AuthSelectionError if the name is unknown.
 */
export const getAuthLayer = (
	name: string = defaultAuthProvider,
): Effect.Effect<AuthLayer, AuthSelectionError> => {
	const factory = registry[name];
	if (!factory) {
		return Effect.fail(
			new AuthSelectionError({
				provider: name,
				message: \`Unknown auth adapter: "\${name}". Available: \${availableAuthProviders.join(", ")}\`,
			}),
		);
	}
	return factory();
};
`;

	return { content, filename: "services/auth-registry.ts" };
};
