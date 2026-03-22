/**
 * Entity and aggregate helper functions.
 */

import type {
	AttributeDef,
	DomainSchema,
	EntityDef,
	EntityIdTypeReference,
	ValueObjectDef,
} from "../schemas";

/**
 * Entry with qualified name and definition.
 */
export interface QualifiedEntry<T> {
	readonly context: string;
	readonly def: T;
	readonly name: string;
}

/**
 * Qualified name for context-scoped items.
 */
export interface QualifiedName {
	readonly context: string;
	readonly name: string;
}

/**
 * Get all entities from all contexts.
 * Returns entries with context and name for qualified references.
 */
export const getAllEntities = (
	schema: DomainSchema,
): readonly QualifiedEntry<EntityDef>[] =>
	Object.entries(schema.contexts).flatMap(([contextName, context]) =>
		Object.entries(context.entities).map(([name, definition]) => ({
			context: contextName,
			def: definition,
			name,
		})),
	);

/**
 * Get all value objects from all contexts.
 * Returns entries with context and name for qualified references.
 */
export const getAllValueObjects = (
	schema: DomainSchema,
): readonly QualifiedEntry<ValueObjectDef>[] =>
	Object.entries(schema.contexts).flatMap(([contextName, context]) =>
		Object.entries(context.valueObjects ?? {}).map(([name, definition]) => ({
			context: contextName,
			def: definition,
			name,
		})),
	);

/**
 * Get entities that are aggregate roots (need repositories).
 * Returns qualified names for aggregate roots across all contexts.
 */
export const getAggregateRoots = (
	schema: DomainSchema,
): readonly QualifiedEntry<EntityDef>[] =>
	getAllEntities(schema).filter((entry) => entry.def.aggregate?.root === true);

/**
 * Get all entities for a specific context.
 */
export const getEntitiesForContext = (
	schema: DomainSchema,
	contextName: string,
): readonly QualifiedEntry<EntityDef>[] =>
	getAllEntities(schema).filter((entry) => entry.context === contextName);

/**
 * Get all value objects for a specific context.
 */
export const getValueObjectsForContext = (
	schema: DomainSchema,
	contextName: string,
): readonly QualifiedEntry<ValueObjectDef>[] =>
	getAllValueObjects(schema).filter((entry) => entry.context === contextName);

/**
 * Get a flat map of entity names to definitions.
 * Note: This assumes entity names are unique across contexts.
 * Use getAllEntities() for context-aware iteration.
 */
export const getEntitiesFlat = (
	schema: DomainSchema,
): Readonly<Record<string, EntityDef>> =>
	Object.fromEntries(
		getAllEntities(schema).map((entry) => [entry.name, entry.def]),
	);

// =============================================================================
// Index Helpers
// =============================================================================

/**
 * Check if an attribute has a unique constraint.
 */
export const isUniqueAttribute = (attribute: AttributeDef): boolean =>
	attribute.constraints?.some((c) => c.kind === "unique") ?? false;

/**
 * Get all unique attributes for an entity.
 * Returns attribute names that have the unique constraint.
 */
export const getUniqueAttributes = (entity: EntityDef): readonly string[] =>
	Object.entries(entity.attributes)
		.filter(([, attribute]) => isUniqueAttribute(attribute))
		.map(([name]) => name);

/**
 * Foreign key attribute info.
 */
export interface ForeignKeyAttribute {
	readonly name: string;
	readonly targetEntity: string;
}

/**
 * Get foreign key attributes (entityId type) for an entity.
 * These are candidates for non-unique index generation.
 */
export const getForeignKeyAttributes = (
	entity: EntityDef,
): readonly ForeignKeyAttribute[] =>
	Object.entries(entity.attributes)
		.filter(([, attribute]) => attribute.type.kind === "entityId")
		.map(([name, attribute]) => ({
			name,
			targetEntity: (attribute.type as EntityIdTypeReference).entity,
		}));
