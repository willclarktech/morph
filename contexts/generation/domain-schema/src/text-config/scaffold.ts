import { indent } from "@morph/utils";

/**
 * Text Configuration Scaffold Generation
 *
 * Functions for deriving required text keys and generating scaffold files.
 */
import type { I18nConfig } from "../extensions";
import type { DomainSchema } from "../schemas";

import { getAllEntities, getAllErrors, getAllOperations } from "../helpers";

// =============================================================================
// Required Keys Derivation
// =============================================================================

/**
 * Derive all required domain text keys from a schema.
 * Returns the list of keys that must be present in text.config.ts.
 */
export const deriveRequiredKeys = (schema: DomainSchema): readonly string[] => {
	const keys: string[] = [];

	// Entity keys
	const entities = getAllEntities(schema);
	for (const entity of entities) {
		const entityKey = entity.name.toLowerCase();
		keys.push(`entity.${entityKey}.singular`);
		keys.push(`entity.${entityKey}.plural`);

		// Field and help keys for each attribute
		for (const [attributeName, attributeDef] of Object.entries(
			entity.def.attributes,
		)) {
			keys.push(`field.${entityKey}.${attributeName}`);
			if (attributeDef.description) {
				keys.push(`help.${entityKey}.${attributeName}`);
			}
		}
	}

	// Operation keys (only @ui tagged operations)
	const ops = getAllOperations(schema).filter((op) =>
		op.def.tags.includes("@ui"),
	);
	for (const op of ops) {
		keys.push(`op.${op.name}`);
	}

	// Error keys
	const errors = getAllErrors(schema);
	for (const error of errors) {
		keys.push(`error.${error.name}`);
	}

	return keys.sort();
};

// =============================================================================
// Scaffold Generation
// =============================================================================

/**
 * Generate a scaffold text.config.ts with all required keys.
 * Values are set to "TODO" as placeholders.
 */
export const generateTextScaffold = (
	schema: DomainSchema,
	i18nConfig: I18nConfig,
): string => {
	const requiredKeys = deriveRequiredKeys(schema);
	const { languages } = i18nConfig;

	const domainEntries = indent(
		requiredKeys
			.map((key) => {
				const langEntries = languages
					.map((lang) => `${lang}: "TODO"`)
					.join(", ");
				return `"${key}": { ${langEntries} },`;
			})
			.join("\n"),
		2,
	);

	return `/**
 * Text Configuration
 *
 * All human-readable text for the application, supporting multiple languages.
 * Keys follow conventions:
 * - Entity: "entity.{name}.singular", "entity.{name}.plural"
 * - Field: "field.{entity}.{name}"
 * - Help: "help.{entity}.{name}"
 * - Operation: "op.{name}"
 * - Error: "error.{Name}"
 */
import { defineText } from "@morph/domain-schema";

export default defineText({
	domain: {
${domainEntries}
	},

	// Optional: Override system or module text
	// overrides: {
	// 	"ui.recentActivity": { en: "Activity Feed", de: "Aktivitätsfeed" },
	// },
});
`;
};
