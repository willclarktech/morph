import type { DomainSchema } from "@morphdsl/domain-schema";
import type { AnyOperation } from "@morphdsl/operation";
import type { Prose, Runner } from "@morphdsl/scenario-runner";

import {
	getDomainServiceAction,
	getPrimaryWriteAggregate,
	isDomainService,
} from "@morphdsl/domain-schema";
import {
	createRunner,
	getField,
	resolveOperationName,
} from "@morphdsl/scenario-runner";

import type { DomainServiceContext } from "./request";
import type { ServerConfig, ServerInstance } from "./server";

import { buildRequest } from "./request";
import { startServer } from "./server";

export interface ApiRunnerConfig {
	readonly auth?: AuthConfig | undefined;
	readonly basePath?: string | undefined;
	readonly operations: Record<string, AnyOperation>;
	readonly prose?: Prose | undefined;
	readonly reset?: "none" | "restart";
	readonly schema?: DomainSchema | undefined;
	readonly server: ServerConfig;
}

export interface AuthConfig {
	readonly authOperation?: string | undefined;
	readonly tokenField?: string | undefined;
}

export const createApiRunner = (config: ApiRunnerConfig): Runner => {
	const basePath = config.basePath ?? "/api";
	const reset = config.reset ?? "restart";

	let server: ServerInstance | undefined;
	let authToken: string | undefined;

	const ensureServer = async (): Promise<ServerInstance> => {
		server ??= await startServer(config.server);
		return server;
	};

	const stopServer = (): void => {
		if (server) {
			server.stop();
			server = undefined;
			authToken = undefined;
		}
	};

	const resolveDomainServiceContext = (
		operationName: string,
	): DomainServiceContext | undefined => {
		if (!config.schema || !isDomainService(config.schema, operationName)) {
			return undefined;
		}
		const primaryAggregate = getPrimaryWriteAggregate(
			config.schema,
			operationName,
		);
		if (!primaryAggregate) return undefined;
		return {
			action: getDomainServiceAction(operationName, primaryAggregate),
			primaryAggregate,
		};
	};

	const lifecycle =
		reset === "restart"
			? { cleanup: stopServer, reset: stopServer }
			: { cleanup: stopServer };

	return createRunner(
		{
			execute: async (name, params) => {
				const instance = await ensureServer();
				const resolvedName = resolveOperationName(
					name,
					Object.keys(config.operations),
				);
				const operation = config.operations[resolvedName];
				if (!operation) {
					throw new Error(`Unknown operation: ${name}`);
				}

				const domainServiceContext = resolveDomainServiceContext(resolvedName);

				const request = buildRequest(
					operation,
					params,
					instance.baseUrl,
					basePath,
					authToken,
					domainServiceContext,
				);

				const response = await fetch(request);
				const responseBody = await response.json();

				if (!response.ok) {
					throw new Error(
						`HTTP ${String(response.status)}: ${JSON.stringify(responseBody)}`,
					);
				}

				if (config.auth?.authOperation === name && config.auth.tokenField) {
					const token = getField(responseBody, config.auth.tokenField);
					if (typeof token === "string") {
						authToken = token;
					}
				}

				return { result: responseBody };
			},
			prose: config.prose,
		},
		lifecycle,
	);
};

export type { ServerConfig, ServerInstance } from "./server";
export { startServer } from "./server";
