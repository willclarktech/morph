/**
 * Type helper functions (product types, sum types, pure types).
 */

import type {
	DomainSchema,
	ProductTypeDef,
	SumTypeDef,
	TypeDef,
} from "../schemas";
import type { QualifiedEntry } from "./entities";

/**
 * Get all pure types from all contexts.
 * Returns entries with context and name for qualified references.
 */
export const getAllTypes = (
	schema: DomainSchema,
): readonly QualifiedEntry<TypeDef>[] =>
	Object.entries(schema.contexts).flatMap(([contextName, context]) =>
		Object.entries(context.types ?? {}).map(([name, definition]) => ({
			context: contextName,
			def: definition,
			name,
		})),
	);

/**
 * Get all product types (records/structs) from all contexts.
 */
export const getProductTypes = (
	schema: DomainSchema,
): readonly QualifiedEntry<ProductTypeDef>[] =>
	getAllTypes(schema).filter(
		(entry): entry is QualifiedEntry<ProductTypeDef> =>
			entry.def.kind === "product",
	);

/**
 * Get all sum types (discriminated unions) from all contexts.
 */
export const getSumTypes = (
	schema: DomainSchema,
): readonly QualifiedEntry<SumTypeDef>[] =>
	getAllTypes(schema).filter(
		(entry): entry is QualifiedEntry<SumTypeDef> => entry.def.kind === "sum",
	);

/**
 * Get a flat map of type names to definitions.
 * Note: This assumes type names are unique across contexts.
 * Use getAllTypes() for context-aware iteration.
 */
export const getTypesFlat = (
	schema: DomainSchema,
): Readonly<Record<string, TypeDef>> =>
	Object.fromEntries(
		getAllTypes(schema).map((entry) => [entry.name, entry.def]),
	);

/**
 * Get all pure types for a specific context.
 */
export const getTypesForContext = (
	schema: DomainSchema,
	contextName: string,
): readonly QualifiedEntry<TypeDef>[] =>
	getAllTypes(schema).filter((entry) => entry.context === contextName);
