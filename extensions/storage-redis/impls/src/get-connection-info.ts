import type { ConnectionInfo } from "@morphdsl/storage-redis-dsl";

import { ConnectionFailedError } from "@morphdsl/storage-redis-dsl";
import { Context, Effect, Layer } from "effect";

import { getRedisState } from "./redis-state";

export interface GetConnectionInfoHandler {
	readonly handle: (
		params: Record<string, never>,
		options: Record<string, never>,
	) => Effect.Effect<ConnectionInfo, ConnectionFailedError>;
}

export const GetConnectionInfoHandler =
	Context.GenericTag<GetConnectionInfoHandler>(
		"@morphdsl/GetConnectionInfoHandler",
	);

export const GetConnectionInfoHandlerLive = Layer.succeed(
	GetConnectionInfoHandler,
	{
		handle: (_params, _options) =>
			Effect.tryPromise({
				try: async () => {
					const state = getRedisState();
					const infoString = (await state.client.send("INFO", [
						"memory",
					])) as string;
					const memMatch = /used_memory:(\d+)/.exec(infoString);
					const memoryUsageBytes = memMatch ? Number(memMatch[1]) : 0;

					const databaseSize = (await state.client.send(
						"DBSIZE",
						[],
					)) as number;

					return {
						url: state.url,
						connected: true,
						memoryUsageBytes,
						keyCount: databaseSize,
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
