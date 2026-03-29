// Port (DI contract) definitions
// Do not edit - regenerate from schema

import type { Effect } from "effect";

import { Context } from "effect";

import type { StorageOperationError } from "./errors";
import type { PaginatedResult, PaginationParams } from "./schemas";

/**
 * Generic entity storage with secondary index support
 */
export interface EntityStore {
	/**
	 * Get entity JSON by ID
	 */
	readonly get: (
		id: string,
	) => Effect.Effect<string | undefined, StorageOperationError>;

	/**
	 * Get all entity JSON values, with optional pagination
	 */
	readonly getAll: (
		pagination?: PaginationParams,
	) => Effect.Effect<PaginatedResult, StorageOperationError>;

	/**
	 * Store entity JSON by ID
	 */
	readonly put: (
		id: string,
		data: string,
	) => Effect.Effect<void, StorageOperationError>;

	/**
	 * Remove entity by ID
	 */
	readonly remove: (id: string) => Effect.Effect<void, StorageOperationError>;

	/**
	 * Find single entity by indexed field value (unique index)
	 */
	readonly findByIndex: (
		field: string,
		value: string,
	) => Effect.Effect<string | undefined, StorageOperationError>;

	/**
	 * Find all entities by indexed field value (non-unique index), with optional pagination
	 */
	readonly findAllByIndex: (
		field: string,
		value: string,
		pagination?: PaginationParams,
	) => Effect.Effect<PaginatedResult, StorageOperationError>;
}

/**
 * Context tag for EntityStore dependency injection.
 */
export const EntityStore =
	Context.GenericTag<EntityStore>("@morphdsl/EntityStore");

/**
 * Raw key-value storage transport
 */
export interface StorageTransport {
	/**
	 * Get value by key
	 */
	readonly get: (
		id: string,
	) => Effect.Effect<string | undefined, StorageOperationError>;

	/**
	 * Get all values, with optional pagination
	 */
	readonly getAll: (
		pagination?: PaginationParams,
	) => Effect.Effect<PaginatedResult, StorageOperationError>;

	/**
	 * Store value by key
	 */
	readonly put: (
		id: string,
		data: string,
	) => Effect.Effect<void, StorageOperationError>;

	/**
	 * Remove value by key
	 */
	readonly remove: (id: string) => Effect.Effect<void, StorageOperationError>;
}

/**
 * Context tag for StorageTransport dependency injection.
 */
export const StorageTransport = Context.GenericTag<StorageTransport>(
	"@morphdsl/StorageTransport",
);
