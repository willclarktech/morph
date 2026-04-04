/**
 * MCP app code generation.
 */
import type {
	DomainSchema,
	GeneratedFile,
	GenerationResult,
	InjectableParam,
} from "@morphdsl/domain-schema";

import {
	getAllEntities,
	getAllInvariants,
	getAllOperations,
	getAllSubscribers,
	getCommandsWithEvents,
	getInjectableParams,
	getOperationAggregates,
	isDomainService,
	schemaHasAuthRequirement,
} from "@morphdsl/domain-schema";
import { indent, separator, sortImports } from "@morphdsl/utils";

import type { ContextPackages } from "./imports";

import {
	generateContextImports,
	generateHandlersLayerMergeCode,
	generateInjectableParamsCode,
	generateOpsMergeCode,
} from "./imports";
import {
	buildEventStoreSetup,
	buildLayerSetup,
	buildStorageSetup,
} from "./layers";
import { generateMcpReadme } from "./readme";

export type { ContextPackages } from "./imports";

/**
 * Infer the auth user type from invariant conditions.
 * Collects all `currentUser.*` property accesses across all invariants.
 */
const inferAuthUserType = (schema: DomainSchema): string => {
	const props = new Set<string>();

	const walkCondition = (condition: unknown): void => {
		const cond = condition as Record<string, unknown>;
		switch (cond["kind"]) {
			case "and":
			case "or": {
				for (const c of cond["conditions"] as unknown[]) walkCondition(c);
				break;
			}
			case "contains": {
				walkValue(cond["collection"]);
				walkValue(cond["value"]);
				break;
			}
			case "equals":
			case "greaterThan":
			case "greaterThanOrEqual":
			case "lessThan":
			case "lessThanOrEqual":
			case "notEquals": {
				walkValue(cond["left"]);
				walkValue(cond["right"]);
				break;
			}
			case "exists":
			case "forAll": {
				walkValue(cond["collection"]);
				walkCondition(cond["condition"]);
				break;
			}
			case "implies": {
				walkCondition(cond["if"]);
				walkCondition(cond["then"]);
				break;
			}
			case "not": {
				walkCondition(cond["condition"]);
				break;
			}
		}
	};

	const walkValue = (value: unknown): void => {
		const value_ = value as Record<string, unknown>;
		switch (value_["kind"]) {
			case "call": {
				for (const argument of value_["args"] as unknown[]) walkValue(argument);
				break;
			}
			case "count": {
				walkValue(value_["collection"]);
				break;
			}
			case "field": {
				const parts = (value_["path"] as string).split(".");
				if (parts[0] === "context" && parts[1] === "currentUser" && parts[2]) {
					props.add(parts[2]);
				} else if (parts[0] === "currentUser" && parts[1]) {
					props.add(parts[1]);
				}
				break;
			}
		}
	};

	for (const entry of getAllInvariants(schema)) {
		walkCondition(entry.def.condition);
	}

	if (props.size === 0) return "{ id: string }";
	if (!props.has("id")) props.add("id");
	return `{ ${[...props].map((p) => `${p}: string`).join("; ")} }`;
};

/**
 * Options for generating an MCP app.
 */
export interface GenerateMcpAppOptions {
	/** Context packages for multi-context apps */
	readonly contexts?: readonly ContextPackages[];
	/** Import path to the core package (legacy single-context) */
	readonly corePackagePath?: string;
	/** DSL package path (legacy single-context) */
	readonly dslPackagePath?: string;
	/** Env var prefix (e.g., "TODO" -> TODO_STORAGE) */
	readonly envPrefix?: string;
	/** MCP server description */
	readonly mcpDescription?: string;
	/** MCP server name (e.g., "todo") */
	readonly mcpName?: string;
	/** Package directory (e.g., "apps/mcp") */
	readonly packageDir?: string;
	/** Domain schema for feature detection */
	readonly schema?: DomainSchema;
	/** Source directory (default: "src") */
	readonly sourceDir?: string;
	/** Whether to prefix tool names with context (for multi-context apps) */
	readonly usePrefix?: boolean;
}

/**
 * Generate an MCP app entry point.
 */
export const generate = (options: GenerateMcpAppOptions): GenerationResult => {
	const packageDir = options.packageDir ?? "apps/mcp";
	const sourceDir = options.sourceDir ?? "src";
	const prefix = `${packageDir}/${sourceDir}/`;
	const mcpName = options.mcpName ?? "mcp-server";
	const envPrefix = options.envPrefix ?? "APP";

	// Determine contexts - use new multi-context or legacy single context
	const contexts: readonly ContextPackages[] = options.contexts ?? [
		{
			contextName: "default",
			corePackage: options.corePackagePath ?? "",
			dslPackage:
				options.dslPackagePath ??
				(options.corePackagePath ?? "").replace("-core", "-dsl"),
		},
	];

	// Detect features from schema
	const hasEntities = options.schema
		? getAllEntities(options.schema).length > 0
		: false;
	const hasEvents = options.schema
		? getCommandsWithEvents(options.schema).length > 0
		: false;
	const hasSubscribers = options.schema
		? getAllSubscribers(options.schema).length > 0
		: false;
	const hasAuth = options.schema
		? schemaHasAuthRequirement(options.schema)
		: false;

	// Compute injectable params from schema
	const injectableParametersMap: Record<string, readonly InjectableParam[]> =
		{};
	if (options.schema) {
		for (const op of getAllOperations(options.schema)) {
			const params = getInjectableParams(options.schema, op.name);
			if (params.length > 0) {
				injectableParametersMap[op.name] = params;
			}
		}
	}
	const hasInjectableParameters =
		Object.keys(injectableParametersMap).length > 0;

	// Build layer composition (includes StderrLogger to avoid polluting stdout)
	const layerSetup = buildLayerSetup({
		hasEntities,
		hasEvents,
		hasSubscribers,
	});

	const eventStoreSetup = hasEvents ? buildEventStoreSetup(envPrefix) : "";
	const storageSetup = hasEntities
		? buildStorageSetup(
				envPrefix,
				hasEvents,
				contexts.length > 1 ? contexts.map((c) => c.contextName) : undefined,
			)
		: "";

	// Build description suffix map for domain services
	const schema = options.schema;
	const domainServiceOps = schema
		? getAllOperations(schema)
				.filter((op) => isDomainService(schema, op.name))
				.map((op) => {
					const aggregates = getOperationAggregates(schema, op.name);
					const scope = aggregates
						.map((a) => `${a.aggregate} (${a.access})`)
						.join(", ");
					return { name: op.name, scope };
				})
		: [];
	const hasDomainServices = domainServiceOps.length > 0;

	// Generate MCP imports based on features
	const mcpImports = hasAuth
		? "createAuthInfoStrategy, createMcp"
		: "createMcp";

	// Generate injectable params constant
	const injectableParametersCode = generateInjectableParamsCode(
		injectableParametersMap,
	);

	// Infer currentUser type from invariant conditions
	const authUserType =
		hasAuth && options.schema
			? inferAuthUserType(options.schema)
			: "{ id: string }";

	// Generate auth strategy setup
	const authStrategyCode = hasAuth
		? `\n// Auth strategy for extracting user from MCP requests\nconst authStrategy = createAuthInfoStrategy<${authUserType}>();\n`
		: "";

	// Build multi-context code
	const contextImports = generateContextImports({
		contexts,
		hasAuth,
		hasEntities,
		hasEvents,
		hasSubscribers,
	});
	const opsMergeCode = generateOpsMergeCode(contexts);
	const handlersLayerMergeCode = generateHandlersLayerMergeCode(contexts);

	// Generate createMcp config
	const descriptionSuffixEntries = domainServiceOps
		.map((op) => `${op.name}: "Coordinates: ${op.scope}",`)
		.join("\n");

	const mcpConfigEntries = [
		...(hasDomainServices
			? [`descriptionSuffix: {\n${indent(descriptionSuffixEntries, 3)}\n\t\t}`]
			: []),
		`name: "${mcpName}"`,
		`version: "1.0.0"`,
		...(hasAuth ? ["auth: authStrategy", "authServiceTag: AuthService"] : []),
		...(hasInjectableParameters ? ["injectableParams"] : []),
	];
	const mcpConfig = mcpConfigEntries.join(separator(2, ","));

	const importBlock = sortImports(
		[
			`import { ${mcpImports} } from "@morphdsl/runtime-mcp";`,
			contextImports,
			`import { Effect, Layer, Logger } from "effect";`,
		].join("\n"),
	);

	const entryContent = `${importBlock}
${opsMergeCode}${handlersLayerMergeCode ? `\n${handlersLayerMergeCode}\n` : ""}${authStrategyCode}${injectableParametersCode}
// MCP uses stdout for JSON-RPC, so redirect logs to stderr
const StderrLogger = Logger.replace(
	Logger.defaultLogger,
	Logger.prettyLogger({ stderr: true }),
);

const main = Effect.gen(function* () {
	${eventStoreSetup}${storageSetup}${layerSetup}

	const mcp = createMcp(ops, AppLayer, {
		${mcpConfig},
	});

	yield* Effect.promise(() => mcp.start());

	// Graceful shutdown on SIGTERM/SIGINT (12-factor: disposability)
	const shutdown = () => {
		console.error("MCP server shutting down...");
		mcp.stop()
			.then(() => {
				console.error("MCP server stopped");
				// eslint-disable-next-line unicorn/no-process-exit -- MCP server must exit on signal
				process.exit(0);
			})
			.catch((error: unknown) => {
				console.error("Error during shutdown:", error);
				// eslint-disable-next-line unicorn/no-process-exit -- MCP server must exit on signal
				process.exit(1);
			});
	};
	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);
});

await Effect.runPromise(main).catch((error: unknown) => {
	console.error("Fatal error:", error);
	// eslint-disable-next-line unicorn/no-process-exit -- MCP server entry point must exit on fatal error
	process.exit(1);
});
`;

	const entryFile: GeneratedFile = {
		content: entryContent,
		filename: `${prefix}index.ts`,
	};

	// Generate README
	const readmeFile: GeneratedFile | undefined = options.schema
		? {
				content: generateMcpReadme(
					options.schema,
					mcpName,
					options.mcpDescription,
				),
				filename: `${packageDir}/README.md`,
			}
		: undefined;

	return { files: readmeFile ? [entryFile, readmeFile] : [entryFile] };
};
