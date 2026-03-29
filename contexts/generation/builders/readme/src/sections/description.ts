/**
 * Generate description section from schema context descriptions.
 */
import type { DomainSchema } from "@morphdsl/domain-schema";

/**
 * Generate a description from all context descriptions in the schema.
 */
export const description = (schema: DomainSchema): string => {
	const contextDescriptions = Object.values(schema.contexts)
		.map((context) => context.description)
		.filter(Boolean);

	if (contextDescriptions.length === 0) return "";

	return contextDescriptions.join("\n\n");
};
