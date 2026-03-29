import type {
	ExecuteOperation,
	Prose,
	Runner,
} from "@morphdsl/scenario-runner";

import { createRunner, resolveOperationName } from "@morphdsl/scenario-runner";

import type { McpInstance } from "./server";

import { startMcpServer } from "./server";

export interface AuthConfig {
	readonly authOperation?: string;
	readonly tokenField?: string;
}

export interface McpRunnerConfig {
	readonly auth?: AuthConfig;
	readonly command: string;
	readonly cwd: string;
	readonly env?: Record<string, string>;
	readonly injectableParamNames?: readonly string[];
	readonly prose?: Prose;
	readonly reset?: "none" | "restart";
	readonly startupTimeout?: number;
}

const getField = (object: unknown, field: string): unknown => {
	if (typeof object !== "object" || object === null) return undefined;
	return (object as Record<string, unknown>)[field];
};

export const createMcpRunner = (config: McpRunnerConfig): Runner => {
	const resetStrategy = config.reset ?? "restart";

	let instance: McpInstance | undefined;
	let currentAuthUser: Record<string, unknown> | undefined;

	const ensureInstance = async (): Promise<McpInstance> => {
		instance ??= await startMcpServer(config);
		return instance;
	};

	const stopInstance = (): void => {
		if (instance) {
			instance.stop();
			instance = undefined;
		}
		currentAuthUser = undefined;
	};

	const execute: ExecuteOperation = async (name, params) => {
		const mcp = await ensureInstance();
		const resolvedName = resolveOperationName(name, mcp.toolNames);
		const result = await mcp.callTool(resolvedName, params, currentAuthUser);

		if (config.auth?.authOperation === name && config.auth.tokenField) {
			const token = getField(result, config.auth.tokenField);
			if (
				typeof token === "string" &&
				typeof result === "object" &&
				result !== null
			) {
				currentAuthUser = result as Record<string, unknown>;
				return { authToken: token, result };
			}
		}

		return { result };
	};

	return createRunner(
		{
			execute,
			injectableParamNames: config.injectableParamNames,
			prose: config.prose,
		},
		resetStrategy === "restart"
			? {
					cleanup: () => stopInstance(),
					reset: () => stopInstance(),
				}
			: { cleanup: () => stopInstance() },
	);
};
