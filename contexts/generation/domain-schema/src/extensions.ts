/**
 * Schema Extensions
 *
 * Infrastructure extensions that generated projects opt into.
 * Declared in the schema alongside domain contexts.
 */
import { Schema } from "effect";

// =============================================================================
// Backend Type Definitions
// =============================================================================

export type StorageBackend =
	| "memory"
	| "jsonfile"
	| "sqlite"
	| "redis"
	| "eventsourced";
export type AuthProvider =
	| "none"
	| "inmemory"
	| "test"
	| "jwt"
	| "session"
	| "apikey";
export type EventStoreBackend = "memory" | "jsonfile" | "redis";
export type EncodingFormat = "json" | "yaml" | "protobuf";

// =============================================================================
// i18n Type Definitions
// =============================================================================

/**
 * Validate a language code using the built-in Intl.Locale API.
 * Returns true if the code is a valid BCP 47 language tag.
 */
export const isValidLanguageCode = (code: string): boolean => {
	try {
		new Intl.Locale(code);
		return true;
	} catch {
		return false;
	}
};

// =============================================================================
// Configuration Interfaces
// =============================================================================

export interface StorageConfig {
	readonly backends: readonly StorageBackend[];
	readonly default: StorageBackend;
}

export interface AuthConfig {
	readonly providers: readonly AuthProvider[];
	readonly default: AuthProvider;
}

export interface EventStoreConfig {
	readonly backends: readonly EventStoreBackend[];
	readonly default: EventStoreBackend;
}

export interface SseConfig {
	readonly enabled: boolean | "auto";
	readonly path?: string;
}

export interface I18nConfig {
	readonly languages: readonly string[];
	readonly baseLanguage: string;
}

export interface EncodingConfig {
	readonly formats: readonly EncodingFormat[];
	readonly default: EncodingFormat;
}

export interface Extensions {
	readonly storage?: StorageConfig;
	readonly auth?: AuthConfig;
	readonly encoding?: EncodingConfig;
	readonly eventStore?: EventStoreConfig;
	readonly sse?: SseConfig;
	readonly i18n?: I18nConfig;
}

// =============================================================================
// Effect Schema Definitions
// =============================================================================

export const StorageBackendSchema = Schema.Literal(
	"memory",
	"jsonfile",
	"sqlite",
	"redis",
	"eventsourced",
);

export const AuthProviderSchema = Schema.Literal(
	"none",
	"inmemory",
	"test",
	"jwt",
	"session",
	"apikey",
);

export const EventStoreBackendSchema = Schema.Literal(
	"memory",
	"jsonfile",
	"redis",
);

export const EncodingFormatSchema = Schema.Literal("json", "yaml", "protobuf");

export const StorageConfigSchema = Schema.Struct({
	backends: Schema.Array(StorageBackendSchema),
	default: StorageBackendSchema,
});

export const AuthConfigSchema = Schema.Struct({
	default: AuthProviderSchema,
	providers: Schema.Array(AuthProviderSchema),
});

export const EventStoreConfigSchema = Schema.Struct({
	backends: Schema.Array(EventStoreBackendSchema),
	default: EventStoreBackendSchema,
});

export const EncodingConfigSchema = Schema.Struct({
	formats: Schema.Array(EncodingFormatSchema),
	default: EncodingFormatSchema,
});

export const SseConfigSchema = Schema.Struct({
	enabled: Schema.Union(Schema.Boolean, Schema.Literal("auto")),
	path: Schema.optionalWith(Schema.String, { exact: true }),
});

export const I18nConfigSchema = Schema.Struct({
	baseLanguage: Schema.String,
	languages: Schema.Array(Schema.String),
}).annotations({
	description: "i18n configuration with BCP 47 language codes",
});

export const ExtensionsSchema = Schema.Struct({
	auth: Schema.optionalWith(AuthConfigSchema, { exact: true }),
	encoding: Schema.optionalWith(EncodingConfigSchema, { exact: true }),
	eventStore: Schema.optionalWith(EventStoreConfigSchema, { exact: true }),
	i18n: Schema.optionalWith(I18nConfigSchema, { exact: true }),
	sse: Schema.optionalWith(SseConfigSchema, { exact: true }),
	storage: Schema.optionalWith(StorageConfigSchema, { exact: true }),
});

// =============================================================================
// Default Extensions
// =============================================================================

export const DEFAULT_EXTENSIONS: Extensions = {
	auth: {
		default: "inmemory",
		providers: ["none", "inmemory", "test"],
	},
	eventStore: {
		backends: ["memory", "jsonfile", "redis"],
		default: "memory",
	},
	i18n: {
		baseLanguage: "en",
		languages: ["en"],
	},
	sse: {
		enabled: "auto",
	},
	storage: {
		backends: ["memory", "jsonfile", "sqlite", "redis"],
		default: "memory",
	},
};

// =============================================================================
// i18n Validation
// =============================================================================

export interface I18nValidationError {
	readonly type:
		| "invalid_language"
		| "base_not_in_languages"
		| "empty_languages";
	readonly message: string;
	readonly code?: string;
}

export const validateI18nConfig = (
	config: I18nConfig,
): readonly I18nValidationError[] => {
	const errors: I18nValidationError[] = [];

	if (config.languages.length === 0) {
		errors.push({
			type: "empty_languages",
			message: "languages array must contain at least one language",
		});
	}

	for (const lang of config.languages) {
		if (!isValidLanguageCode(lang)) {
			errors.push({
				type: "invalid_language",
				message: `Invalid BCP 47 language code: "${lang}"`,
				code: lang,
			});
		}
	}

	if (!config.languages.includes(config.baseLanguage)) {
		errors.push({
			type: "base_not_in_languages",
			message: `baseLanguage "${config.baseLanguage}" must be in languages array`,
			code: config.baseLanguage,
		});
	}

	return errors;
};
