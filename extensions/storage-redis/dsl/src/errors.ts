// Effect TaggedError definitions
// Do not edit - regenerate from schema

import { Data } from "effect";

/**
 * Failed to connect to the Redis server
 */
export class ConnectionFailedError extends Data.TaggedError(
	"ConnectionFailedError",
)<{
	readonly url: string;
	readonly message: string;
}> {}

/**
 * Redis connection timed out
 */
export class ConnectionTimeoutError extends Data.TaggedError(
	"ConnectionTimeoutError",
)<{
	readonly url: string;
	readonly timeoutMs: number;
}> {}

/**
 * Union of all storageRedis context errors.
 */
export type StorageRedisError = ConnectionFailedError | ConnectionTimeoutError;
