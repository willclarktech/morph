import type { EventStoreTransport } from "@morph/eventstore-dsl";

import {
	EventStoreConnectionError,
	EventStoreOperationError,
} from "@morph/eventstore-dsl";
import { Effect } from "effect";

type RedisClient = InstanceType<typeof Bun.RedisClient>;

/**
 * Connect to Redis using Bun.redis.
 * Returns the client or fails with EventStoreConnectionError.
 */
export const connectEventStoreRedis = (
	url?: string,
): Effect.Effect<RedisClient, EventStoreConnectionError> =>
	Effect.tryPromise({
		try: async () => {
			const client = url ? new Bun.RedisClient(url) : new Bun.RedisClient();
			await client.connect();
			return client;
		},
		catch: (error) =>
			new EventStoreConnectionError({
				message: `Failed to connect to Redis for event store. Is REDIS_URL set? ${String(error)}`,
			}),
	});

const EVENTS_KEY = "domain_events";

/**
 * Create a Redis-backed EventStoreTransport using a sorted set.
 * Timestamp is used as score for ordering.
 */
export const createRedisEventStoreTransport = (
	redis: RedisClient,
	key = EVENTS_KEY,
): EventStoreTransport => ({
	append: (data) =>
		Effect.tryPromise({
			try: async () => {
				const parsed = JSON.parse(data) as { occurredAt?: string };
				const score = new Date(parsed.occurredAt ?? Date.now()).getTime();
				await redis.zadd(key, score, data);
			},
			catch: (error) =>
				new EventStoreOperationError({
					message: `Failed to append event to Redis: ${String(error)}`,
				}),
		}),

	getAll: () =>
		Effect.tryPromise({
			try: async () => {
				const results = await redis.zrange(key, 0, -1);
				return results;
			},
			catch: (error) =>
				new EventStoreOperationError({
					message: `Failed to get events from Redis: ${String(error)}`,
				}),
		}),

	getByAggregateId: (aggregateId) =>
		Effect.tryPromise({
			try: async () => {
				const results = await redis.zrange(key, 0, -1);
				return results.filter((item) => {
					const parsed = JSON.parse(item) as { aggregateId?: string };
					return parsed.aggregateId === aggregateId;
				});
			},
			catch: (error) =>
				new EventStoreOperationError({
					message: `Failed to get events from Redis: ${String(error)}`,
				}),
		}),

	getByTag: (tag) =>
		Effect.tryPromise({
			try: async () => {
				const results = await redis.zrange(key, 0, -1);
				return results.filter((item) => {
					const parsed = JSON.parse(item) as { _tag?: string };
					return parsed._tag === tag;
				});
			},
			catch: (error) =>
				new EventStoreOperationError({
					message: `Failed to get events from Redis: ${String(error)}`,
				}),
		}),

	getAfter: (timestamp) =>
		Effect.tryPromise({
			try: async () => {
				const minScore = new Date(timestamp).getTime();
				const results = await redis.zrangebyscore(key, minScore, "+inf");
				return results;
			},
			catch: (error) =>
				new EventStoreOperationError({
					message: `Failed to get events from Redis: ${String(error)}`,
				}),
		}),
});
