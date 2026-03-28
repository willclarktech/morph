import type {
	ConnectionInfo,
	ConnectionTimeoutError,
} from "@morph/storage-redis-dsl";

import { ConnectionFailedError } from "@morph/storage-redis-dsl";
import { Context, Effect, Layer } from "effect";

export interface ConnectHandler {
	readonly handle: (
		params: Record<string, never>,
		options: { readonly url?: string | undefined },
	) => Effect.Effect<
		ConnectionInfo,
		ConnectionFailedError | ConnectionTimeoutError
	>;
}

export const ConnectHandler = Context.GenericTag<ConnectHandler>(
	"@morph/ConnectHandler",
);

export const ConnectHandlerLive = Layer.succeed(ConnectHandler, {
	handle: (_params, options) =>
		Effect.gen(function* () {
			const url =
				options.url ?? process.env["REDIS_URL"] ?? "redis://localhost:6379";

			const client = yield* Effect.tryPromise({
				try: async () => {
					const c = new Bun.RedisClient(url);
					await c.connect();
					return c;
				},
				catch: (error) =>
					new ConnectionFailedError({
						url,
						message: String(error),
					}),
			});

			const info = yield* Effect.tryPromise({
				try: async () => {
					const infoString = (await client.send("INFO", ["memory"])) as string;
					const memMatch = /used_memory:(\d+)/.exec(infoString);
					const memoryUsageBytes = memMatch ? Number(memMatch[1]) : 0;

					const databaseSizeString = (await client.send(
						"DBSIZE",
						[],
					)) as number;

					return {
						url,
						connected: true,
						memoryUsageBytes,
						keyCount: databaseSizeString,
					} satisfies ConnectionInfo;
				},
				catch: (error) =>
					new ConnectionFailedError({
						url,
						message: `Connected but failed to query info: ${String(error)}`,
					}),
			});

			return info;
		}),
});
