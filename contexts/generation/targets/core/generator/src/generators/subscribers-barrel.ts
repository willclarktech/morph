import type { DomainSchema } from "@morph/domain-schema";

import { getAllSubscribers } from "@morph/domain-schema";
import { toKebabCase, toPascalCase } from "@morph/utils";

/**
 * Generate the subscribers barrel file (subscribers/index.ts).
 *
 * Uses `export *` pattern for maintainability.
 * Includes SubscribersLive layer combining all subscriber implementations.
 *
 * @param includeImpls - Whether to include subscriber layer (default: true)
 */
export const generateSubscribersBarrel = (
	schema: DomainSchema,
	includeImpls = true,
): string | undefined => {
	const subscribers = getAllSubscribers(schema);

	if (subscribers.length === 0) {
		return undefined;
	}

	const subscriberNames = subscribers.map((s) => s.name).toSorted();

	// Re-export all subscriber modules using `export *` pattern
	const exports = subscriberNames
		.map((name) => `export * from "./${toKebabCase(name)}";`)
		.join("\n");

	if (!includeImpls) {
		return ["// Generated subscribers barrel", "", exports, ""].join("\n");
	}

	// Import subscriber implementations
	const implImports = subscriberNames
		.map(
			(name) =>
				`import { ${toPascalCase(name)}SubscriberLive } from "./${toKebabCase(name)}/impl";`,
		)
		.join("\n");

	// Generate SubscribersLive layer combining all implementations
	const subscribersLive = [
		"/**",
		" * Combined layer with all subscriber implementations.",
		" */",
		"export const SubscribersLive = Layer.mergeAll(",
		...subscriberNames.map((name) => `\t${toPascalCase(name)}SubscriberLive,`),
		");",
	].join("\n");

	return [
		"// Generated subscribers barrel",
		"",
		'import { Layer } from "effect";',
		"",
		implImports,
		"",
		exports,
		"",
		subscribersLive,
		"",
	].join("\n");
};
