/**
 * Main text/i18n module generation.
 */
import type {
	DomainSchema,
	I18nConfig,
	TextConfig,
} from "@morphdsl/domain-schema";

import { TEXT } from "@morphdsl/auth-password-impls";
import { sortObjectKeys } from "@morphdsl/utils";

import type { UiTextConfig } from "../config";

import { SYSTEM_TEXT } from "../system-text";
import { generateFallbackDomainTranslations } from "./fallback";

/**
 * Merge text sources in order: system -> module -> domain -> overrides.
 * Later sources override earlier ones.
 */
export const mergeTextSources = (
	systemText: Record<string, Record<string, string>>,
	moduleText: Record<string, Record<string, string>>,
	domainText: Record<string, Record<string, string>>,
	overrides: Record<string, Record<string, string>>,
): Record<string, Record<string, string>> => {
	const merged: Record<string, Record<string, string>> = {};

	// Merge in order
	for (const source of [systemText, moduleText, domainText, overrides]) {
		for (const [key, entry] of Object.entries(source)) {
			merged[key] = { ...merged[key], ...entry };
		}
	}

	return merged;
};

/**
 * Generate the text/i18n module with translations.
 */
export const generateTextModule = (
	schema: DomainSchema,
	i18nConfig: I18nConfig | undefined,
	textConfig: TextConfig | undefined,
	hasAuth: boolean,
	legacyTextConfig: UiTextConfig = {},
): string => {
	// Use new config if available, otherwise fall back to legacy behavior
	const languages =
		i18nConfig?.languages ??
		Object.keys(legacyTextConfig.languages ?? { de: "Deutsch", en: "English" });
	const baseLanguage =
		i18nConfig?.baseLanguage ?? legacyTextConfig.defaultLanguage ?? "en";

	// Build language display names using Intl.DisplayNames
	const languageNames: Record<string, string> = {};
	for (const lang of languages) {
		try {
			const names = new Intl.DisplayNames([lang], { type: "language" });
			languageNames[lang] = names.of(lang) ?? lang;
		} catch {
			languageNames[lang] = lang;
		}
	}

	// Collect module text (auth if enabled)
	const moduleText = hasAuth ? { ...TEXT } : {};

	// Get domain text from text config or generate fallback
	const domainText = textConfig?.domain
		? { ...textConfig.domain }
		: generateFallbackDomainTranslations(schema);

	// Get overrides
	const overrides = textConfig?.overrides
		? { ...textConfig.overrides }
		: (legacyTextConfig.translations ?? {});

	// Merge all text sources
	const mergedTranslations = mergeTextSources(
		{ ...SYSTEM_TEXT },
		moduleText,
		domainText,
		overrides,
	);

	// Build translations object grouped by language
	const translationsByLang: Record<string, Record<string, string>> = {};
	for (const lang of languages) {
		translationsByLang[lang] = {};
		for (const [key, entry] of Object.entries(mergedTranslations)) {
			translationsByLang[lang][key] =
				entry[lang] ?? entry[baseLanguage] ?? entry["en"] ?? key;
		}
	}

	return `/**
 * Text/i18n module with translations and language utilities.
 */
import { loadSettings, saveSettings } from "./settings";

/**
 * Available translations organized by language.
 */
const translations: Record<string, Record<string, string>> = ${JSON.stringify(sortObjectKeys(translationsByLang), undefined, "\t")};

/**
 * Available languages with display names.
 */
const languageNames: Record<string, string> = ${JSON.stringify(sortObjectKeys(languageNames), undefined, "\t")};

/**
 * Default language.
 */
const defaultLanguage = "${baseLanguage}";

/**
 * Get all available language codes.
 */
export const getLanguages = (): readonly string[] => Object.keys(languageNames);

/**
 * Get the display name for a language code.
 */
export const getLanguageDisplayName = (lang: string): string =>
	languageNames[lang] ?? lang;

/**
 * Get the current language from settings.
 */
export const getLanguage = (): string => {
	const settings = loadSettings();
	return settings.language ?? defaultLanguage;
};

/**
 * Set the current language and save to settings.
 */
export const setLanguage = (lang: string): void => {
	const settings = loadSettings();
	saveSettings({ ...settings, language: lang });
};

/**
 * Translate a key to the current language.
 * Returns the key itself if no translation is found.
 * Supports parameter substitution: t("error.notFound", { entity: "Todo" })
 */
export const t = (key: string, params?: Record<string, string>): string => {
	const lang = getLanguage();
	const langTranslations = translations[lang] ?? translations[defaultLanguage];
	let result = langTranslations?.[key] ?? translations[defaultLanguage]?.[key] ?? key;
	if (params) {
		for (const [name, value] of Object.entries(params)) {
			result = result.replaceAll(\`{\${name}}\`, value);
		}
	}
	return result;
};
`;
};
