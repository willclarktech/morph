/**
 * Text Configuration Schema Definitions
 *
 * Effect Schema definitions for validating and parsing text configurations.
 */
import { Schema } from "effect";

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * A single translation entry mapping language codes to translated text.
 * Language codes follow BCP 47 (e.g., "en", "es", "de", "zh-Hans").
 */
export type TranslationEntry = Readonly<Record<string, string>>;

/**
 * Domain-specific text derived from schema entities and operations.
 * Keys follow naming conventions:
 * - Entity: "entity.{name}.singular", "entity.{name}.plural"
 * - Field: "field.{entity}.{name}"
 * - Help: "help.{entity}.{name}"
 * - Operation: "op.{name}"
 * - Error: "error.{Name}"
 */
export type DomainTextCatalog = Readonly<Record<string, TranslationEntry>>;

/**
 * Override text catalog for customizing system text.
 * Can override any key from system or module text.
 */
export type OverrideTextCatalog = Readonly<Record<string, TranslationEntry>>;

/**
 * Complete text configuration for an application.
 */
export interface TextConfig {
	/** Domain-specific text (entities, fields, operations, errors) */
	readonly domain: DomainTextCatalog;
	/** Optional overrides for system/module text */
	readonly overrides?: OverrideTextCatalog;
}

// =============================================================================
// Effect Schema Definitions
// =============================================================================

export const TranslationEntrySchema = Schema.Record({
	key: Schema.String,
	value: Schema.String,
});

export const DomainTextCatalogSchema = Schema.Record({
	key: Schema.String,
	value: TranslationEntrySchema,
});

export const OverrideTextCatalogSchema = Schema.Record({
	key: Schema.String,
	value: TranslationEntrySchema,
});

export const TextConfigSchema = Schema.Struct({
	domain: DomainTextCatalogSchema,
	overrides: Schema.optionalWith(OverrideTextCatalogSchema, { exact: true }),
});

// =============================================================================
// Parsing Functions
// =============================================================================

export const parseTextConfig = Schema.decodeUnknownSync(TextConfigSchema);
export const parseTextConfigEither =
	Schema.decodeUnknownEither(TextConfigSchema);

// =============================================================================
// defineText Helper
// =============================================================================

/**
 * Type-safe text configuration builder.
 * Use this function to define text.config.ts for IDE autocomplete and type checking.
 */
export const defineText = (config: TextConfig): TextConfig => config;
