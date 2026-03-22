import type { ExecuteOperation, Prose, Runner } from "@morph/scenario-runner";
import type { ServerConfig, ServerInstance } from "@morph/scenario-runner-api";

import { createRunner, getField } from "@morph/scenario-runner";
import { startServer } from "@morph/scenario-runner-api";
import { execSync } from "node:child_process";

export type ParamOrder = Record<string, readonly string[]>;
export type OptionNames = Record<string, readonly string[]>;
export type SensitiveParameters = Record<string, readonly string[]>;

export interface AuthConfig {
	readonly authOperation?: string;
	readonly tokenField?: string;
}

export interface ClientCliRunnerConfig {
	readonly auth?: AuthConfig;
	readonly command: string;
	readonly cwd: string;
	readonly envPrefix?: string;
	readonly injectableParamNames?: readonly string[];
	readonly optionNames?: OptionNames;
	readonly paramOrder: ParamOrder;
	readonly prose?: Prose;
	readonly reset?: "none" | "restart";
	readonly sensitiveParams?: SensitiveParameters;
	readonly server: ServerConfig;
}

const toKebabCase = (s: string): string =>
	s.replaceAll(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

const stringify = (value: unknown): string =>
	typeof value === "string" ? value : JSON.stringify(value);

export const createClientCliRunner = (
	config: ClientCliRunnerConfig,
): Runner => {
	const resetStrategy = config.reset ?? "restart";
	const envPrefix = config.envPrefix ?? "";

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
		}
		authToken = undefined;
	};

	const runCli = (
		command: string,
		params: Record<string, unknown>,
		baseUrl: string,
	): unknown => {
		const paramOrder = config.paramOrder[command] ?? [];
		const positionalArguments = paramOrder
			.map((key) => JSON.stringify(params[key]))
			.join(" ");

		const optionNames = config.optionNames?.[command] ?? [];
		const flags = optionNames
			.filter((key) => params[key] !== undefined)
			.map((key) => `--${toKebabCase(key)} ${JSON.stringify(params[key])}`)
			.join(" ");

		const allArguments = [positionalArguments, flags].filter(Boolean).join(" ");

		const fullCommand = `${config.command} ${command} ${allArguments}`;

		const configEnvironment: Record<string, string> = {};
		if (envPrefix) {
			configEnvironment[`${envPrefix}_API_URL`] = baseUrl;
			if (authToken) {
				configEnvironment[`${envPrefix}_API_TOKEN`] = authToken;
			}
		}

		const sensitiveParamNames = config.sensitiveParams?.[command] ?? [];
		const sensitiveEnvironment: Record<string, string> = {};
		if (envPrefix) {
			const commandEnvironmentPart = command.toUpperCase().replaceAll("-", "_");
			for (const paramName of sensitiveParamNames) {
				const value = params[paramName];
				if (value !== undefined) {
					const paramEnvironmentPart = toKebabCase(paramName)
						.toUpperCase()
						.replaceAll("-", "_");
					sensitiveEnvironment[
						`${envPrefix}_${commandEnvironmentPart}_${paramEnvironmentPart}`
					] = stringify(value);
				}
			}
		}

		const result = execSync(fullCommand, {
			cwd: config.cwd,
			encoding: "utf8",
			env: {
				...process.env,
				...configEnvironment,
				...sensitiveEnvironment,
			},
		});

		return JSON.parse(result) as unknown;
	};

	const execute: ExecuteOperation = async (name, params) => {
		const instance = await ensureServer();
		const cliCommand = toKebabCase(name);

		if (!config.paramOrder[cliCommand]) {
			throw new Error(`Unknown CLI command: ${cliCommand}`);
		}

		const result = runCli(cliCommand, params, instance.baseUrl);

		if (config.auth?.authOperation === name && config.auth.tokenField) {
			const token = getField(result, config.auth.tokenField);
			if (typeof token === "string") {
				authToken = token;
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
			? { cleanup: stopServer, reset: stopServer }
			: { cleanup: stopServer },
	);
};
