import type { PaginationParams, StorageTransport } from "@morphdsl/storage-dsl";

import {
	applyPagination,
	StorageConnectionError,
	StorageOperationError,
} from "@morphdsl/storage-dsl";
import { Effect } from "effect";

type RedisClient = InstanceType<typeof Bun.RedisClient>;

/**
 * Connect to Redis using Bun.redis.
 * Returns the client or fails with StorageConnectionError.
 */
export const connectRedis = (
	url?: string,
): Effect.Effect<RedisClient, StorageConnectionError> =>
	Effect.tryPromise({
		try: async () => {
			const client = url ? new Bun.RedisClient(url) : new Bun.RedisClient();
			await client.connect();
			return client;
		},
		catch: (error) =>
			new StorageConnectionError({
				message: `Failed to connect to Redis. Is REDIS_URL set? ${String(error)}`,
			}),
	});

/**
 * Create a Redis-backed StorageTransport using a hash per collection.
 * Each collection maps to a Redis hash key.
 */
export const createRedisTransport = (
	redis: RedisClient,
	collection: string,
): StorageTransport => ({
	get: (id) =>
		Effect.tryPromise({
			try: async () => {
				const data = await redis.hget(collection, id);
				return data ?? undefined;
			},
			catch: (error) =>
				new StorageOperationError({
					message: `Redis get failed: ${String(error)}`,
				}),
		}),
	getAll: (pagination?: PaginationParams) =>
		Effect.tryPromise({
			try: async () => {
				const all = await redis.hvals(collection);
				return applyPagination(all, pagination);
			},
			catch: (error) =>
				new StorageOperationError({
					message: `Redis getAll failed: ${String(error)}`,
				}),
		}),
	put: (id, data) =>
		Effect.tryPromise({
			try: async () => {
				await redis.hset(collection, id, data);
			},
			catch: (error) =>
				new StorageOperationError({
					message: `Redis put failed: ${String(error)}`,
				}),
		}),
	remove: (id) =>
		Effect.tryPromise({
			try: async () => {
				await redis.hdel(collection, id);
			},
			catch: (error) =>
				new StorageOperationError({
					message: `Redis remove failed: ${String(error)}`,
				}),
		}),
});
