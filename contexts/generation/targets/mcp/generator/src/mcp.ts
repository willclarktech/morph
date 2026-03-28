/**
 * MCP server runtime creation.
 */
import type { InjectableParam } from "@morph/domain-schema";
import type { Context } from "effect";
import type { Layer } from "effect/Layer";
import type * as S from "effect/Schema";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { isOperation } from "@morph/operation";
import { jsonStringify } from "@morph/utils";
import { Cause, Effect, Exit, ManagedRuntime } from "effect";
import { z } from "zod";

import type { AuthService, McpAuthStrategy, McpExtra } from "./auth";

import { AuthServiceTag, createRequestAuthService } from "./auth";
import { injectParameters } from "./params";
import { effectSchemaToZodShape, getSchemaDescription } from "./schema";

/**
 * Operation type for MCP tool registration.
 */
interface McpOperation {
	readonly name: string;
	readonly params: S.Schema.All;
	readonly options: unknown;
	readonly execute: (
		params: unknown,
		options: unknown,
	) => Effect.Effect<unknown, unknown, unknown>;
	readonly description?: string;
}

/**
 * Configuration for the MCP server.
 */
export interface McpConfig<TUser = unknown> {
	/** Auth strategy for extracting user from MCP requests */
	readonly auth?: McpAuthStrategy<TUser>;
	/** AuthService context tag from generated code (to match handler requirements) */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accepts any AuthService-compatible tag
	readonly authServiceTag?: Context.Tag<any, any>;
	/** Server description */
	readonly description?: string;
	/** Map of operation names to description suffixes (e.g., for aggregate scope) */
	readonly descriptionSuffix?: Readonly<Record<string, string>>;
	/** Injectable params per operation (inferred from invariants) */
	readonly injectableParams?: Readonly<
		Record<string, readonly InjectableParam[]>
	>;
	/** Server name */
	readonly name?: string;
	/** Server version */
	readonly version?: string;
}

/**
 * Result of creating an MCP server.
 */
export interface McpResult {
	/** The underlying MCP server instance */
	readonly server: McpServer;
	/** Start the server with specified transport */
	readonly start: (transport?: "stdio") => Promise<void>;
	/** Stop the server and dispose runtime */
	readonly stop: () => Promise<void>;
}

/**
 * Format an error for MCP response.
 */
const formatError = (error: unknown): string => {
	if (error && typeof error === "object" && "_tag" in error) {
		const tagged = error as { _tag: string; message?: string };
		return jsonStringify({
			_tag: tagged._tag,
			message: tagged.message ?? tagged._tag,
		});
	}
	if (error instanceof Error) {
		return jsonStringify({ _tag: "Error", message: error.message });
	}
	return jsonStringify({ _tag: "Error", message: String(error) });
};

/**
 * Create an MCP server from operations and an Effect layer.
 *
 * @param module - Object containing operations (like the `ops` export from generated code)
 * @param layer - Effect layer providing all dependencies
 * @param config - Optional MCP configuration
 */
export const createMcp = <R, TUser = unknown>(
	module: Record<string, unknown>,
	layer: Layer<R>,
	config: McpConfig<TUser> = {},
): McpResult => {
	const name = config.name ?? "mcp-server";
	const version = config.version ?? "1.0.0";
	const authStrategy = config.auth;

	const authTag = (config.authServiceTag ?? AuthServiceTag) as Context.Tag<
		AuthService,
		AuthService
	>;
	const injectableParametersMap = config.injectableParams ?? {};

	// Extract operations from module - use entries to preserve custom keys (for multi-context prefix support)
	const operationEntries = Object.entries(module).filter(
		(entry): entry is [string, McpOperation] => isOperation(entry[1]),
	);

	// Create a managed runtime that persists layer state
	const runtime = ManagedRuntime.make(layer);

	// Create MCP server
	const server = new McpServer({
		name,
		version,
	});

	// Register each operation as an MCP tool
	for (const [toolName, operation] of operationEntries) {
		// Get injectable params for this operation (use original operation name, not the key)
		const opInjectableParameters =
			injectableParametersMap[operation.name] ?? [];
		const injectableNames = opInjectableParameters.map((p) => p.paramName);

		// Filter schema to hide injectable params from tool schema
		// Add _meta for test runner auth support
		const zodShape = {
			...effectSchemaToZodShape(operation.params, injectableNames),
			_meta: z.any().optional(),
		};
		const baseDescription =
			operation.description ?? getSchemaDescription(operation.params);
		const suffix = config.descriptionSuffix?.[operation.name];
		const opDescription = suffix
			? `${baseDescription ?? `Execute ${toolName}`} [${suffix}]`
			: (baseDescription ?? `Execute ${toolName}`);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-deprecated -- MCP SDK tool method has complex types
		(server.tool as any)(
			toolName, // Use the key (allows prefixes like "auth_generate")
			opDescription,
			zodShape,
			async (args: Record<string, unknown>, extra: McpExtra) => {
				// Extract _meta from args if present (for testing support)
				const metaFromArguments = args["_meta"] as McpExtra | undefined;
				const { _meta: _, ...cleanArguments } = args;

				// Extract user from MCP auth context or args._meta (for testing)
				const effectiveExtra = metaFromArguments ?? extra;
				const user = authStrategy?.extractUser(effectiveExtra);

				// Inject missing params from auth context
				const injectedArguments = injectParameters(cleanArguments, {
					currentUser: user as { id: string } | undefined,
					injectableParams: opInjectableParameters,
				});

				// Create per-request AuthService
				const authService = createRequestAuthService(user);

				// Execute the operation with injected params and auth service
				const effect = operation
					.execute(injectedArguments, {})
					.pipe(Effect.provideService(authTag, authService)) as Effect.Effect<
					unknown,
					unknown,
					R
				>;

				const exit = await runtime.runPromiseExit(effect);

				if (Exit.isSuccess(exit)) {
					return {
						content: [
							{
								text: jsonStringify(exit.value),
								type: "text" as const,
							},
						],
					};
				}

				const error = Cause.squash(exit.cause);
				return {
					content: [
						{
							text: formatError(error),
							type: "text" as const,
						},
					],
					isError: true,
				};
			},
		);
	}

	const start = async (_transport: "stdio" = "stdio") => {
		// Currently only stdio transport is supported
		const stdioTransport = new StdioServerTransport();
		await server.connect(stdioTransport);
	};

	const stop = async () => {
		await server.close();
		await runtime.dispose();
	};

	return { server, start, stop };
};
