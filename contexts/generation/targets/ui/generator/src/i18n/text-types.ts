/**
 * Text types module generation.
 */
import type { I18nConfig } from "@morphdsl/domain-schema";

import { separator } from "@morphdsl/utils";

/**
 * Generate the text-types.ts file with Language and TextKey union types.
 */
export const generateTextTypesModule = (
	i18nConfig: I18nConfig,
	allKeys: readonly string[],
): string => {
	const languageUnion = i18nConfig.languages.map((l) => `"${l}"`).join(" | ");
	const textKeyUnion = allKeys
		.map((k) => `"${k}"`)
		.join(separator(1, "", "| "));

	return `/**
 * Generated i18n type definitions.
 * DO NOT EDIT - regenerated from schema extensions.
 */

/**
 * Supported languages (from schema extensions).
 */
export type Language = ${languageUnion};

/**
 * All available translation keys.
 */
export type TextKey =
\t| ${textKeyUnion};

/**
 * A translation entry with all required languages.
 */
export type TranslationEntry = Readonly<Record<Language, string>>;
`;
};
