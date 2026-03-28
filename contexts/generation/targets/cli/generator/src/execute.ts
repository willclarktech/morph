import type { CodecRegistry } from "@morph/codec-dsl";
import type * as Layer from "effect/Layer";

import { getFieldNames } from "@morph/operation";
import { jsonStringify, toKebabCase } from "@morph/utils";
import { Exit } from "effect";
import * as Effect from "effect/Effect";
import * as S from "effect/Schema";

import type { CliConfig, CliOperation } from "./help";
import type { parseArguments } from "./parser";

import { readSchemaFile, readUiConfigFile } from "./env";
import { isGenerationResult } from "./guards";
import { formatHelp, formatUsage } from "./help";
import { isHelpRequest } from "./parser";
import { promptSecure } from "./prompt";
import {
	getSchemaDescription,
	getSensitiveParameters,
	isSchemaParamPrimitiveString,
} from "./schema";
import { writeFiles } from "./write";

/**
 * Coerce a positional CLI arg string to its intended type.
 * CLI args are always strings, but schemas may expect numbers or booleans.
 */
const coercePositionalArgument = (value: string | undefined): unknown => {
	if (value === undefined) return undefined;
	if (value === "true") return true;
	if (value === "false") return false;
	const number_ = Number(value);
	if (value !== "" && !Number.isNaN(number_)) return number_;
	return value;
};

/**
 * Format output using codec registry or default to JSON.
 */
const formatOutput = async (
	value: unknown,
	format: string | undefined,
	codecRegistry: CodecRegistry | undefined,
): Promise<string> => {
	if (format && codecRegistry) {
		const codecResult = await Effect.runPromiseExit(codecRegistry.get(format));
		if (Exit.isSuccess(codecResult)) {
			const encodeResult = await Effect.runPromiseExit(
				codecResult.value.encode(value, "output"),
			);
			if (Exit.isSuccess(encodeResult)) {
				return String(encodeResult.value.body);
			}
		}
	}
	return jsonStringify(value);
};

export interface ExecuteCommandOptions<R> {
	readonly codecRegistry?: CodecRegistry | undefined;
	readonly commandName: string;
	readonly config: CliConfig;
	readonly layer: Layer.Layer<R>;
	readonly operation: CliOperation;
	readonly parsed: ReturnType<typeof parseArguments>;
}

export const executeCommand = async <R>(
	options: ExecuteCommandOptions<R>,
): Promise<number> => {
	const { commandName, config, layer, operation, parsed } = options;

	// Get injectable params and aggregate scope from config (computed at generation time)
	const injectableParamNames = config.injectableParams?.[operation.name] ?? [];
	const aggregateScope = config.aggregateScope?.[operation.name];

	// Handle --help / -h
	if (isHelpRequest(parsed)) {
		console.info(
			formatHelp(operation, commandName, injectableParamNames, aggregateScope),
		);
		return 0;
	}

	const parameterNames = getFieldNames(operation.params);
	const optionNames = getFieldNames(operation.options);
	const sensitiveParameters = getSensitiveParameters(operation);

	// Non-sensitive, non-injectable params come from positional args (excluding schema which comes from --schema-file)
	const positionalParamNames = parameterNames.filter(
		(name) =>
			name !== "schema" &&
			!sensitiveParameters.includes(name) &&
			!injectableParamNames.includes(name),
	);
	const parameters = Object.fromEntries(
		positionalParamNames.map((name, index) => [
			name,
			coercePositionalArgument(parsed.positional[index]),
		]),
	);

	const schemaFile = parsed.options["schema-file"];
	// Check if schema param expects a raw string (primitive type)
	const schemaParamExpectsString =
		parameterNames.includes("schema") &&
		isSchemaParamPrimitiveString(operation.params);
	const schemaResult =
		schemaFile !== undefined && parameterNames.includes("schema")
			? readSchemaFile(schemaFile, schemaParamExpectsString)
			: undefined;

	if (schemaResult !== undefined && !schemaResult.ok) {
		return 1;
	}

	// Load UI config file if specified
	const uiConfigFile = parsed.options["ui-config-file"];
	const uiConfigResult =
		uiConfigFile === undefined
			? undefined
			: await readUiConfigFile(uiConfigFile);

	if (uiConfigResult !== undefined && !uiConfigResult.ok) {
		return 1;
	}

	// Prompt for sensitive params securely (or use env vars for testing)
	const sensitiveValues: Record<string, string> = {};
	for (const name of sensitiveParameters) {
		const envVariableName = config.envPrefix
			? `${config.envPrefix}_${toKebabCase(operation.name).toUpperCase().replaceAll("-", "_")}_${toKebabCase(name).toUpperCase().replaceAll("-", "_")}`
			: undefined;
		const envValue = envVariableName ? process.env[envVariableName] : undefined;

		if (envValue === undefined) {
			const desc = getSchemaDescription(operation.params, name);
			const promptLabel = desc
				? `${toKebabCase(name)} (${desc}): `
				: `${toKebabCase(name)}: `;
			sensitiveValues[name] = await promptSecure(promptLabel);
		} else {
			sensitiveValues[name] = envValue;
		}
	}

	const finalParameters: Readonly<Record<string, unknown>> = {
		...parameters,
		...sensitiveValues,
		...(schemaResult ? { schema: schemaResult.schema } : {}),
	};

	const filteredOptions: Record<string, unknown> = Object.fromEntries(
		optionNames
			.filter((name) => name !== "uiConfig") // config files handled separately
			.map((name) => [name, parsed.options[toKebabCase(name)]] as const)
			.filter(([, value]) => value !== undefined),
	);

	// Add UI config if loaded
	if (uiConfigResult?.ok) {
		filteredOptions["uiConfig"] = uiConfigResult.config;
	}

	// Check for missing non-sensitive params
	const missingParameters = positionalParamNames.filter(
		(name) => finalParameters[name] === undefined,
	);
	if (missingParameters.length > 0) {
		console.error(
			`Missing required parameters: ${missingParameters.join(", ")}`,
		);
		console.error(formatUsage(operation, commandName, injectableParamNames));
		return 1;
	}

	// Validate parameters against schema
	let validatedParameters: unknown;
	if (injectableParamNames.length > 0) {
		validatedParameters = finalParameters;
	} else {
		const paramsSchema = operation.params as S.Schema<unknown, unknown>;
		const paramsDecodeResult =
			S.decodeUnknownEither(paramsSchema)(finalParameters);
		if (paramsDecodeResult._tag === "Left") {
			const parseError = paramsDecodeResult.left;
			console.error(`Validation error: ${parseError.message}`);
			return 1;
		}
		validatedParameters = paramsDecodeResult.right;
	}

	let result: unknown;
	try {
		const effect = operation.execute(
			validatedParameters,
			filteredOptions,
		) as Effect.Effect<unknown, unknown, R>;
		result = await Effect.runPromise(Effect.provide(effect, layer));
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"_tag" in error &&
			"message" in error
		) {
			const taggedError = error as {
				readonly _tag: string;
				readonly message: string;
			};
			console.error(`Error [${taggedError._tag}]: ${taggedError.message}`);
		} else {
			console.error(error instanceof Error ? error.message : String(error));
		}
		return 1;
	}

	const dryRun = parsed.options["dry-run"] === "true";
	const outputDir = parsed.options["output-dir"] ?? ".";

	if (isGenerationResult(result)) {
		if (dryRun) {
			console.info(jsonStringify(result));
		} else {
			await Effect.runPromise(writeFiles(result.files, outputDir));
		}
	} else {
		const formatName = parsed.options["format"];
		console.info(await formatOutput(result, formatName, options.codecRegistry));
	}
	return 0;
};
