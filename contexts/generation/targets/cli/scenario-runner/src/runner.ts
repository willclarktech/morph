import type { Prose, Runner } from "@morph/scenario-runner";

import { createRunner, resolveOperationName } from "@morph/scenario-runner";
import { jsonParse, jsonStringify } from "@morph/utils";
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

export interface AuthParameters {
	readonly emailParam: string;
	readonly passwordParam: string;
}

export interface CliRunnerConfig {
	readonly appName?: string;
	readonly authParams?: AuthParameters;
	readonly command: string;
	readonly cwd?: string;
	readonly dataFile?: string;
	readonly optionNames?: OptionNames;
	readonly paramOrder: ParamOrder;
	readonly prose?: Prose;
	readonly sensitiveParams?: SensitiveParameters;
	readonly storage?: string;
}

export type OptionNames = Record<string, readonly string[]>;
export type ParamOrder = Record<string, readonly string[]>;
export type SensitiveParameters = Record<string, readonly string[]>;

const toKebabCase = (s: string): string =>
	s.replaceAll(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

const stringify = (value: unknown): string =>
	typeof value === "string" ? value : jsonStringify(value);

const toEnvironmentPrefix = (name: string): string =>
	name.toUpperCase().replaceAll("-", "_");

export const createCliRunner = (config: CliRunnerConfig): Runner => {
	const dataFile = config.dataFile ?? "/tmp/morph-test-data.json";
	const storage = config.storage ?? "jsonfile";
	const envPrefix = config.appName ? toEnvironmentPrefix(config.appName) : "";

	let authCredentials: undefined | { email: string; password: string };

	const cleanDataFile = (): void => {
		try {
			rmSync(dataFile);
		} catch {
			// file may not exist
		}
	};

	cleanDataFile();

	return createRunner(
		{
			execute: (name, params) => {
				const rawCommand = toKebabCase(name);
				const command = resolveOperationName(
					rawCommand,
					Object.keys(config.paramOrder),
				);

				if (command === "create-user" && config.authParams) {
					authCredentials = {
						email: stringify(params[config.authParams.emailParam] ?? ""),
						password: stringify(params[config.authParams.passwordParam] ?? ""),
					};
				}

				const paramOrder = config.paramOrder[command] ?? [];
				const positionalArguments = paramOrder
					.map((key) => jsonStringify(params[key]))
					.join(" ");

				const optionNames = config.optionNames?.[command] ?? [];
				const flags = optionNames
					.filter((key) => params[key] !== undefined)
					.map((key) => `--${toKebabCase(key)} ${jsonStringify(params[key])}`)
					.join(" ");

				const allArguments = [positionalArguments, flags]
					.filter(Boolean)
					.join(" ");

				const authEnvironment =
					authCredentials && envPrefix
						? {
								[`${envPrefix}_EMAIL`]: authCredentials.email,
								[`${envPrefix}_PASSWORD`]: authCredentials.password,
							}
						: {};

				const sensitiveParamNames = config.sensitiveParams?.[command] ?? [];
				const sensitiveEnvironment: Record<string, string> = {};
				if (envPrefix) {
					const commandEnvironmentPart = command
						.toUpperCase()
						.replaceAll("-", "_");
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

				const storageEnvironmentVariable = envPrefix
					? `${envPrefix}_STORAGE`
					: "STORAGE";
				const dataFileEnvironmentVariable = envPrefix
					? `${envPrefix}_DATA_FILE`
					: "DATA_FILE";

				const result = execSync(
					`${config.command} ${command} ${allArguments}`,
					{
						cwd: config.cwd,
						encoding: "utf8",
						env: {
							...process.env,
							[dataFileEnvironmentVariable]: dataFile,
							[storageEnvironmentVariable]: storage,
							...authEnvironment,
							...sensitiveEnvironment,
						},
					},
				);

				return Promise.resolve({ result: jsonParse(result) });
			},
			prose: config.prose,
		},
		{
			reset: () => {
				cleanDataFile();
				authCredentials = undefined;
			},
		},
	);
};
