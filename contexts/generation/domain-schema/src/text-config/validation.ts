/**
 * Text Configuration Validation
 *
 * Validation logic for ensuring text configurations are complete and correct.
 */
import type { I18nConfig } from "../extensions";
import type { DomainSchema } from "../schemas";
import type { TextConfig } from "./schemas";

import { deriveRequiredKeys } from "./scaffold";

// =============================================================================
// Validation Types
// =============================================================================

export interface TextValidationError {
	readonly type:
		| "missing_key"
		| "missing_language"
		| "empty_value"
		| "unknown_key";
	readonly key: string;
	readonly message: string;
	readonly language?: string;
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate text configuration against schema and i18n config.
 * Returns validation errors for:
 * - Missing required domain keys
 * - Missing language translations for any key
 * - Empty string values
 */
export const validateTextConfig = (
	textConfig: TextConfig,
	schema: DomainSchema,
	i18nConfig: I18nConfig,
): readonly TextValidationError[] => {
	const errors: TextValidationError[] = [];
	const requiredKeys = deriveRequiredKeys(schema);
	const { languages } = i18nConfig;

	// Check for missing required keys
	for (const key of requiredKeys) {
		if (!(key in textConfig.domain)) {
			errors.push({
				type: "missing_key",
				key,
				message: `Missing required domain text key: "${key}"`,
			});
		}
	}

	// Check all keys in domain catalog
	for (const [key, entry] of Object.entries(textConfig.domain)) {
		// Check for unknown keys (possible typos)
		if (!requiredKeys.includes(key)) {
			// Find similar keys for suggestion
			const similar = requiredKeys.find(
				(k) =>
					k.toLowerCase().includes(key.toLowerCase().split(".").pop() ?? "") ||
					key.toLowerCase().includes(k.toLowerCase().split(".").pop() ?? ""),
			);
			errors.push({
				type: "unknown_key",
				key,
				message: similar
					? `Unknown domain text key: "${key}" - did you mean "${similar}"?`
					: `Unknown domain text key: "${key}"`,
			});
		}

		// Check all required languages have values
		for (const lang of languages) {
			if (!(lang in entry)) {
				errors.push({
					type: "missing_language",
					key,
					language: lang,
					message: `Missing "${lang}" translation for key "${key}"`,
				});
			} else if (entry[lang] === "") {
				errors.push({
					type: "empty_value",
					key,
					language: lang,
					message: `Empty translation for key "${key}" in language "${lang}"`,
				});
			}
		}
	}

	// Check overrides for language completeness
	if (textConfig.overrides) {
		for (const [key, entry] of Object.entries(textConfig.overrides)) {
			for (const lang of languages) {
				if (!(lang in entry)) {
					errors.push({
						type: "missing_language",
						key,
						language: lang,
						message: `Missing "${lang}" translation for override key "${key}"`,
					});
				} else if (entry[lang] === "") {
					errors.push({
						type: "empty_value",
						key,
						language: lang,
						message: `Empty translation for override key "${key}" in language "${lang}"`,
					});
				}
			}
		}
	}

	return errors;
};

/**
 * Format validation errors for display.
 */
export const formatTextValidationErrors = (
	errors: readonly TextValidationError[],
	i18nConfig: I18nConfig,
): string => {
	if (errors.length === 0) return "";

	const lines: string[] = [
		"Text validation failed",
		"",
		`  Configured languages: ${i18nConfig.languages.join(", ")}`,
		"",
	];

	const missingKeys = errors.filter((error) => error.type === "missing_key");
	const missingLangs = errors.filter(
		(error) => error.type === "missing_language",
	);
	const emptyValues = errors.filter((error) => error.type === "empty_value");
	const unknownKeys = errors.filter((error) => error.type === "unknown_key");

	if (missingKeys.length > 0) {
		lines.push("  Missing domain keys:");
		for (const error of missingKeys) {
			lines.push(`    - ${error.key}`);
		}
		lines.push("");
	}

	if (missingLangs.length > 0) {
		lines.push("  Missing translations:");
		for (const error of missingLangs) {
			lines.push(`    - ${error.key} (missing: ${error.language})`);
		}
		lines.push("");
	}

	if (emptyValues.length > 0) {
		lines.push("  Empty values:");
		for (const error of emptyValues) {
			lines.push(`    - ${error.key} (${error.language})`);
		}
		lines.push("");
	}

	if (unknownKeys.length > 0) {
		lines.push("  Unknown keys (possible typos):");
		for (const error of unknownKeys) {
			lines.push(`    - ${error.message}`);
		}
		lines.push("");
	}

	lines.push("  Run `bun generate:text-scaffold` to create template.");

	return lines.join("\n");
};
