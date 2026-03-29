/**
 * UI Generator configuration types.
 */
import type {
	DomainSchema,
	I18nConfig,
	TextConfig,
	TranslationEntry,
} from "@morphdsl/domain-schema";

/**
 * UI theme configuration (maps to Pico CSS variables).
 */
export interface UiTheme {
	readonly background?: string;
	readonly backgroundAlt?: string;
	readonly borderColor?: string;
	readonly borderRadius?: string;
	readonly buttonShadow?: string;
	readonly cardShadow?: string;
	readonly colorScheme?: "light" | "dark" | "auto";
	readonly fontFamily?: string;
	readonly fontSize?: string;
	readonly headingWeight?: string;
	readonly lineHeight?: string;
	readonly primary?: string;
	readonly primaryFocus?: string;
	readonly primaryHover?: string;
	readonly secondary?: string;
	readonly spacing?: string;
	readonly text?: string;
	readonly textMuted?: string;
	readonly transition?: string;
}

/**
 * UI brand configuration.
 */
export interface UiBrand {
	readonly logo?: string;
}

/**
 * UI text configuration for i18n.
 */
export interface UiTextConfig {
	/** Default language code (default: "en") */
	readonly defaultLanguage?: string;
	/** Available languages with display names */
	readonly languages?: Record<string, string>;
	/** Custom translations to override defaults */
	readonly translations?: Record<string, TranslationEntry>;
}

/**
 * UI configuration (loaded from ui.config.ts).
 */
export interface UiConfig {
	readonly brand?: UiBrand;
	readonly text?: UiTextConfig;
	readonly theme?: UiTheme;
}

/**
 * Options for generating UI app.
 */
export interface GenerateUiAppOptions {
	readonly apiUrl?: string;
	readonly appName: string;
	readonly clientPackagePath: string;
	readonly dslPackagePath: string;
	readonly envPrefix?: string;
	/** i18n configuration (from schema extensions) */
	readonly i18nConfig?: I18nConfig;
	readonly packageDir?: string;
	readonly schema: DomainSchema;
	readonly sourceDir?: string;
	/** Text configuration (from text.config.ts) */
	readonly textConfig?: TextConfig;
	readonly uiConfig?: UiConfig;
	readonly uiName?: string;
}
