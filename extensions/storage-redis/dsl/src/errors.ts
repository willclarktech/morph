// Effect TaggedError definitions
// Do not edit - regenerate from schema

import { Data } from "effect";

/**
 * Failed to connect to the Redis server
 */
export class ConnectionFailedError extends Data.TaggedError(
	"ConnectionFailedError",
)<{
	readonly message: string;
	readonly url: string;
}> {}

/**
 * Redis connection timed out
 */
export class ConnectionTimeoutError extends Data.TaggedError(
	"ConnectionTimeoutError",
)<{
	readonly timeoutMs: number;
	readonly url: string;
}> {}

/**
 * Union of all storageRedis context errors.
 */
export type StorageRedisError = ConnectionFailedError | ConnectionTimeoutError;
