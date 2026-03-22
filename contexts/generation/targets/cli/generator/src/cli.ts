/**
 * CLI creation from operations and Effect layers.
 */
import type * as Layer from "effect/Layer";

import { isOperation } from "@morph/operation";
import { toKebabCase } from "@morph/utils";

import type { CliConfig, CliOperation, OperationEntry } from "./help";

import { executeCommand } from "./execute";
import { formatBaseHelp } from "./help";
import { isHelpRequest, parseArguments } from "./parser";

export type { CliConfig } from "./help";

export interface CliResult {
	readonly run: (argv: readonly string[]) => Promise<number>;
}

export const createCli = <R>(
	module: Record<string, unknown>,
	layer: Layer.Layer<R>,
	config: CliConfig = {},
): CliResult => {
	// Use entries to preserve custom keys (for multi-context prefix support)
	const operationEntries = Object.entries(module).filter(
		(entry): entry is [string, CliOperation] => isOperation(entry[1]),
	);

	// Build command entries with kebab-case names for help display
	const commandEntries: OperationEntry[] = operationEntries.map(
		([key, op]) => [toKebabCase(key), op] as const,
	);

	// Map command names to [commandName, operation] for lookup
	const operationsByName = new Map(
		commandEntries.map(([commandName, operation]) => [
			commandName,
			{ commandName, operation },
		]),
	);

	const run = async (argv: readonly string[]): Promise<number> => {
		const parsed = parseArguments(argv);

		// Handle base --help (no command)
		if (
			!parsed.command ||
			parsed.command === "--help" ||
			parsed.command === "-h"
		) {
			const isHelp =
				!parsed.command ||
				isHelpRequest(parsed) ||
				parsed.command === "--help" ||
				parsed.command === "-h";
			if (isHelp) {
				console.info(formatBaseHelp(commandEntries, config));
				return 0;
			}
		}

		const entry = parsed.command
			? operationsByName.get(parsed.command)
			: undefined;

		if (!entry) {
			console.error(`Unknown command: ${parsed.command}\n`);
			console.error(formatBaseHelp(commandEntries, config));
			return 1;
		}

		return executeCommand({
			codecRegistry: config.codecRegistry,
			commandName: entry.commandName,
			config,
			layer,
			operation: entry.operation,
			parsed,
		});
	};

	return { run };
};
