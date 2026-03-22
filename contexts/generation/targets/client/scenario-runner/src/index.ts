/**
 * Morph Test Runner - Client
 *
 * Tests generated HTTP client libraries by calling client methods directly.
 * Starts an API server subprocess, creates a typed Effect client, and
 * executes client methods as Effects.
 */
import type { Prose, Runner } from "@morph/scenario-runner";
import type { ServerConfig, ServerInstance } from "@morph/scenario-runner-api";

import { createRunner, getField } from "@morph/scenario-runner";
import { startServer } from "@morph/scenario-runner-api";
import { Effect } from "effect";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Client accepts any generated client type
export type Client = Record<string, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Factory accepts any client type
export type ClientFactory<C = any> = (config: {
	readonly baseUrl: string;
	readonly token?: string;
}) => C;

export interface AuthConfig {
	readonly authOperation?: string;
	readonly tokenField?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Config accepts any client type
export interface ClientRunnerConfig<C = any> {
	readonly auth?: AuthConfig;
	readonly createClient: ClientFactory<C>;
	readonly prose?: Prose;
	readonly reset?: "none" | "restart";
	readonly server: ServerConfig;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Runner accepts any client type
export const createClientRunner = <C = any>(
	config: ClientRunnerConfig<C>,
): Runner => {
	const reset = config.reset ?? "restart";

	let server: ServerInstance | undefined;
	let currentClient: Client | undefined;
	let currentToken: string | undefined;

	const ensureServer = async (): Promise<ServerInstance> => {
		server ??= await startServer(config.server);
		return server;
	};

	const stopServer = (): void => {
		if (server) {
			server.stop();
			server = undefined;
			currentClient = undefined;
			currentToken = undefined;
		}
	};

	const getClient = async (): Promise<Client> => {
		const instance = await ensureServer();
		currentClient ??= config.createClient(
			currentToken
				? { baseUrl: instance.baseUrl, token: currentToken }
				: { baseUrl: instance.baseUrl },
		) as Client;
		return currentClient;
	};

	const lifecycle =
		reset === "restart"
			? { cleanup: stopServer, reset: stopServer }
			: { cleanup: stopServer };

	return createRunner(
		{
			execute: async (name, params) => {
				const client = await getClient();
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Client methods have dynamic types
				const method = client[name];

				if (!method) {
					throw new Error(`Unknown client method: ${name}`);
				}

				// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment -- Client methods have dynamic types
				const effect = method(params);
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Effect result from dynamic client
				const result = await Effect.runPromise(effect);

				if (config.auth?.authOperation === name && config.auth.tokenField) {
					const token = getField(result, config.auth.tokenField);
					if (typeof token === "string") {
						currentToken = token;
						// Recreate client with new auth token
						currentClient = undefined;
					}
				}

				return { result };
			},
			prose: config.prose,
		},
		lifecycle,
	);
};

export type { ServerConfig, ServerInstance } from "@morph/scenario-runner-api";
export { startServer } from "@morph/scenario-runner-api";
