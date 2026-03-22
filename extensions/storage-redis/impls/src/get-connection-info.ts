import { Context, Effect, Layer } from "effect";

import type { ConnectionInfo } from "@morph/storage-redis-dsl";

import { ConnectionFailedError } from "@morph/storage-redis-dsl";

import { getRedisState } from "./redis-state";

export interface GetConnectionInfoHandler {
	readonly handle: (
		params: Record<string, never>,
		options: Record<string, never>,
	) => Effect.Effect<ConnectionInfo, ConnectionFailedError>;
}

export const GetConnectionInfoHandler =
	Context.GenericTag<GetConnectionInfoHandler>(
		"@morph/GetConnectionInfoHandler",
	);

export const GetConnectionInfoHandlerLive = Layer.succeed(
	GetConnectionInfoHandler,
	{
		handle: (_params, _options) =>
			Effect.tryPromise({
				try: async () => {
					const state = getRedisState();
					const infoStr = (await state.client.send("INFO", [
						"memory",
					])) as string;
					const memMatch = /used_memory:(\d+)/.exec(infoStr);
					const memoryUsageBytes = memMatch ? Number(memMatch[1]) : 0;

					const dbSize = (await state.client.send("DBSIZE", [])) as number;

					return {
						url: state.url,
						connected: true,
						memoryUsageBytes,
						keyCount: dbSize,
					} satisfies ConnectionInfo;
				},
				catch: (error) =>
					new ConnectionFailedError({
						url: "",
						message: String(error),
					}),
			}),
	},
);
