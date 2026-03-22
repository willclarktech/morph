/**
 * CLI help text formatting.
 */
import type { CodecRegistry } from "@morph/codec-dsl";
import type * as S from "effect/Schema";
import type { Effect } from "effect/Effect";

import { getFieldNames } from "@morph/operation";
import { toKebabCase } from "@morph/utils";

import { getSchemaDescription, getSensitiveParameters } from "./schema";

/**
 * Operation type for CLI runtime.
 * Simplified from AnyOperation to avoid brand requirements at runtime.
 */
export interface CliOperation {
	readonly name: string;
	readonly params: S.Schema.All;
	readonly options: S.Schema.All;
	readonly execute: (
		params: unknown,
		options: unknown,
	) => Effect<unknown, unknown, unknown>;
	readonly description?: string;
}

export interface CliConfig {
	/** Map of operation names to aggregate scope strings (e.g., "User (read), Todo (write)") */
	readonly aggregateScope?: Readonly<Record<string, string>>;
	/** Codec registry for multi-format output (--format flag) */
	readonly codecRegistry?: CodecRegistry | undefined;
	/** Brief description of what the CLI does */
	readonly description?: string;
	/** Env var prefix for test credentials (e.g., "TODO_APP" -> TODO_APP_CREATE_USER_PASSWORD) */
	readonly envPrefix?: string;
	/** Map of operation names to their auth-injectable parameter names (computed at generation time) */
	readonly injectableParams?: Readonly<Record<string, readonly string[]>>;
	/** CLI program name (e.g., "todo-app") */
	readonly name?: string;
}

export const formatUsage = (
	operation: CliOperation,
	commandName: string,
	injectableParamNames: readonly string[] = [],
): string => {
	const parameterNames = getFieldNames(operation.params);
	const optNames = getFieldNames(operation.options);
	const hasSchemaParam = parameterNames.includes("schema");
	const sensitiveParameters = getSensitiveParameters(operation);

	const displayParameters = parameterNames.filter(
		(name) =>
			name !== "schema" &&
			!sensitiveParameters.includes(name) &&
			!injectableParamNames.includes(name),
	);
	const paramsString = displayParameters
		.map((name) => `<${toKebabCase(name)}>`)
		.join(" ");

	const schemaFileOption = hasSchemaParam ? ["--schema-file <path>"] : [];
	const optionsString = [
		...schemaFileOption,
		...optNames.map((name) => `[--${toKebabCase(name)} <value>]`),
	].join(" ");

	return `Usage: ${commandName} ${paramsString} ${optionsString}`.trim();
};

export const formatHelp = (
	operation: CliOperation,
	commandName: string,
	injectableParamNames: readonly string[] = [],
	aggregateScope?: string,
): string => {
	const lines: string[] = [];

	lines.push(`${commandName} - ${operation.description ?? "No description"}`);

	if (aggregateScope) {
		lines.push(`[Coordinates: ${aggregateScope}]`);
	}

	lines.push("");
	lines.push(formatUsage(operation, commandName, injectableParamNames));

	const parameterNames = getFieldNames(operation.params);
	const hasSchemaParam = parameterNames.includes("schema");
	const sensitiveParameters = getSensitiveParameters(operation);
	const displayParameters = parameterNames.filter(
		(name) =>
			name !== "schema" &&
			!sensitiveParameters.includes(name) &&
			!injectableParamNames.includes(name),
	);

	if (displayParameters.length > 0) {
		lines.push("");
		lines.push("Arguments:");
		for (const name of displayParameters) {
			const desc = getSchemaDescription(operation.params, name);
			const kebabName = toKebabCase(name).padEnd(16);
			lines.push(`  ${kebabName}${desc ?? ""}`);
		}
	}

	if (sensitiveParameters.length > 0) {
		lines.push("");
		lines.push("Prompted (secure input):");
		for (const name of sensitiveParameters) {
			const desc = getSchemaDescription(operation.params, name);
			const kebabName = toKebabCase(name).padEnd(16);
			lines.push(`  ${kebabName}${desc ?? ""}`);
		}
	}

	const optNames = getFieldNames(operation.options);
	const hasUiConfigOpt = optNames.includes("uiConfig");

	lines.push("");
	lines.push("Options:");
	if (hasSchemaParam) {
		lines.push(`  --schema-file         Path to schema JSON file`);
	}
	if (hasUiConfigOpt) {
		lines.push(`  --ui-config-file      Path to UI config (.ts or .json)`);
	}
	for (const name of optNames) {
		if (name === "uiConfig") continue;
		const desc = getSchemaDescription(operation.options, name);
		const kebabName = `--${toKebabCase(name)}`.padEnd(20);
		lines.push(`  ${kebabName}${desc ?? ""}`);
	}
	lines.push(`  --help, -h            Show this help message`);

	return lines.join("\n");
};

/**
 * Operation entry with command name and operation.
 */
export type OperationEntry = readonly [
	commandName: string,
	operation: CliOperation,
];

export const formatBaseHelp = (
	entries: readonly OperationEntry[],
	config: CliConfig,
): string => {
	const lines: string[] = [];
	const programName = config.name ?? "cli";

	if (config.description) {
		lines.push(`${programName} - ${config.description}`);
	} else {
		lines.push(programName);
	}

	lines.push("");
	lines.push(`Usage: ${programName} <command> [options]`);

	lines.push("");
	lines.push("Commands:");
	const maxNameLength = Math.max(
		...entries.map(([commandName]) => commandName.length),
	);
	for (const [commandName, op] of entries) {
		const name = commandName.padEnd(maxNameLength + 2);
		const desc = op.description ?? "";
		lines.push(`  ${name}${desc}`);
	}

	lines.push("");
	lines.push("Global options:");
	lines.push("  --storage <name>       Storage backend (default: memory)");
	lines.push("  --event-store <name>   Event store backend (default: memory)");
	lines.push("  --help, -h             Show help");

	lines.push("");
	lines.push(`Run '${programName} <command> --help' for more information.`);

	return lines.join("\n");
};
