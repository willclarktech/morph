// Generated from DomainSchema: Morph
// Do not edit manually

// Effect/Schema Definitions

import * as S from "effect/Schema";

// Pure Type Schemas (transformation-centric)

// Describes a secondary index on an entity field
export const IndexDescriptorSchema = S.Struct({
	kind: S.Union(S.Literal("unique"), S.Literal("nonUnique")),
	field: S.String,
});

export type IndexDescriptor = S.Schema.Type<typeof IndexDescriptorSchema>;

export const parseIndexDescriptor = S.decodeUnknownSync(IndexDescriptorSchema);
export const parseIndexDescriptorEither = S.decodeUnknownEither(
	IndexDescriptorSchema,
);
export const encodeIndexDescriptor = S.encodeSync(IndexDescriptorSchema);

// Configuration for an entity store instance
export const EntityStoreConfigSchema = S.Struct({
	entityName: S.String,
	tableName: S.String,
	indexes: S.Array(IndexDescriptorSchema),
});

export type EntityStoreConfig = S.Schema.Type<typeof EntityStoreConfigSchema>;

export const parseEntityStoreConfig = S.decodeUnknownSync(
	EntityStoreConfigSchema,
);
export const parseEntityStoreConfigEither = S.decodeUnknownEither(
	EntityStoreConfigSchema,
);
export const encodeEntityStoreConfig = S.encodeSync(EntityStoreConfigSchema);

// Pagination parameters for list operations
export const PaginationParamsSchema = S.Struct({
	limit: S.optional(S.Number),
	offset: S.optional(S.Number),
});

export type PaginationParams = S.Schema.Type<typeof PaginationParamsSchema>;

// Paginated result returned by list operations
export const PaginatedResultSchema = S.Struct({
	items: S.Array(S.String),
	total: S.Number,
});

export type PaginatedResult = S.Schema.Type<typeof PaginatedResultSchema>;

/**
 * Apply offset-based pagination to an in-memory array.
 * When no pagination is provided, returns all items.
 */
export const applyPagination = (
	items: readonly string[],
	pagination?: PaginationParams | undefined,
): PaginatedResult => {
	const total = items.length;
	if (!pagination) return { items, total };

	const offset = pagination.offset ?? 0;
	const limit = pagination.limit ?? total;
	return { items: items.slice(offset, offset + limit), total };
};
