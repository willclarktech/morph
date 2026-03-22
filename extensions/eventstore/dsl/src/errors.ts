// Effect TaggedError definitions
// Do not edit - regenerate from schema

import { Data } from "effect";

/**
 * Event store operation failed
 */
export class EventStoreOperationError extends Data.TaggedError(
	"EventStoreOperationError",
)<{
	readonly message: string;
}> {}

/**
 * Failed to connect to event store backend
 */
export class EventStoreConnectionError extends Data.TaggedError(
	"EventStoreConnectionError",
)<{
	readonly message: string;
}> {}

/**
 * Union of all eventstore context errors.
 */
export type EventStoreError =
	| EventStoreConnectionError
	| EventStoreOperationError;
