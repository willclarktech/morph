// Effect TaggedError definitions
// Do not edit - regenerate from schema

import { Data } from "effect";

/**
 * Failed to connect to the Redis event store
 */
export class ConnectionFailedError extends Data.TaggedError(
	"ConnectionFailedError",
)<{
	readonly message: string;
	readonly url: string;
}> {}

/**
 * Redis event store connection timed out
 */
export class ConnectionTimeoutError extends Data.TaggedError(
	"ConnectionTimeoutError",
)<{
	readonly timeoutMs: number;
	readonly url: string;
}> {}

/**
 * Union of all eventstoreRedis context errors.
 */
export type EventstoreRedisError =
	| ConnectionFailedError
	| ConnectionTimeoutError;
