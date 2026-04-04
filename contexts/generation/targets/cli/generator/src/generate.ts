/**
 * CLI app code generation.
 */
import type {
	DomainSchema,
	EncodingFormat,
	GeneratedFile,
	GenerationResult,
} from "@morphdsl/domain-schema";

import {
	getAllEntities,
	getAllSubscribers,
	getCommandsWithEvents,
	schemaHasAuthRequirement,
} from "@morphdsl/domain-schema";
import { configProperties, indent, sortImports } from "@morphdsl/utils";

import type { ContextPackages } from "./imports";

import { generateAuthLayerCode } from "./auth-gen";
import {
	buildAggregateScopeConfig,
	buildInjectableParamsConfig,
	generateOperationWrapperCode,
	getDomainServiceOps,
	getOperationsWithInjectable,
} from "./config-gen";
import {
	generateContextImports,
	generateHandlersLayerMergeCode,
	generateOpsMergeCode,
} from "./imports";
import {
	generateAppLayerCode,
	generateEventStoreLayerCode,
	generateStorageLayerCode,
} from "./layers";
import { generateCliReadme } from "./readme";
import { generateSeedFile } from "./seed";

export type { ContextPackages } from "./imports";

export interface GenerateAppOptions {
	/** Brief description of what the CLI does */
	readonly cliDescription?: string;
	/** CLI program name (e.g., "todo") */
	readonly cliName?: string;
	/** Context packages for multi-context apps */
	readonly contexts?: readonly ContextPackages[];
	/** Import path to the core package (legacy single-context) */
	readonly corePackagePath?: string;
	/** Import path to the DSL package (legacy single-context) */
	readonly dslPackagePath?: string;
	/** Env var prefix (e.g., "TODO" -> TODO_STORAGE). Defaults to CLI name in uppercase with hyphens replaced by underscores. */
	readonly envPrefix?: string;
	/** Package directory (e.g., "apps/my-cli") - prepended to all filenames */
	readonly packageDir?: string;
	/** Domain schema (for event/subscriber detection) */
	readonly schema?: DomainSchema;
	/** Source directory within the package (default: "src") */
	readonly sourceDir?: string;
	/** Whether to prefix command names with context (for multi-context apps) */
	readonly usePrefix?: boolean;
}

export const generate = (options: GenerateAppOptions): GenerationResult => {
	const packagePrefix = options.packageDir ? `${options.packageDir}/` : "";
	const sourcePrefix = `${options.sourceDir ?? "src"}/`;
	const prefix = `${packagePrefix}${sourcePrefix}`;

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

	// Generate env var prefix from CLI name (e.g., "todo" -> "TODO")
	const envPrefix =
		options.envPrefix ??
		(options.cliName ?? "cli").toUpperCase().replaceAll("-", "_");

	// Check if schema has entities, events, subscribers, and auth requirements
	const hasEntities = options.schema
		? getAllEntities(options.schema).length > 0
		: true; // Default to true for backward compatibility without schema
	const hasEvents = options.schema
		? getCommandsWithEvents(options.schema).length > 0
		: false;
	const hasSubscribers = options.schema
		? getAllSubscribers(options.schema).length > 0
		: false;
	const hasAuth = options.schema
		? schemaHasAuthRequirement(options.schema)
		: false;
	const hasSqlite =
		options.schema?.extensions?.storage?.backends?.includes("sqlite") ?? false;

	// Encoding extension
	const encodingFormats: readonly EncodingFormat[] =
		options.schema?.extensions?.encoding?.formats ?? [];
	const encodingDefault =
		options.schema?.extensions?.encoding?.default ?? "json";
	const hasEncoding = encodingFormats.length > 0;

	// Generate layer code
	const appLayerCode = generateAppLayerCode({
		hasAuth,
		hasEntities,
		hasEvents,
		hasSubscribers,
	});

	// Layer code — event store resolved first so it can be provided to eventsourced storage
	const eventStoreLayerCode = hasEvents
		? generateEventStoreLayerCode(envPrefix)
		: "";
	const storageLayerCode = hasEntities
		? generateStorageLayerCode(
				envPrefix,
				hasEvents,
				contexts.length > 1 ? contexts.map((c) => c.contextName) : undefined,
			)
		: "";

	// Argv filter code
	const argvFilterCode =
		hasEntities || hasEvents
			? `const argv = ${hasEvents ? `filterBackendArgument(filterBackendArgument(process.argv.slice(2), "--storage"), "--event-store")` : `filterBackendArgument(process.argv.slice(2), "--storage")`};`
			: `const argv = process.argv.slice(2);`;

	// Auth code - get User type from the first context that depends on auth
	const authLayerCode = hasAuth ? generateAuthLayerCode(envPrefix) : "";

	// Detect operations with injectable params
	const schema = options.schema;
	const operationsWithInjectable = schema
		? getOperationsWithInjectable(schema)
		: [];
	const hasInjectableParameters = operationsWithInjectable.length > 0;

	// Generate wrapper and config code
	const operationWrapperCode = hasInjectableParameters
		? generateOperationWrapperCode(operationsWithInjectable)
		: "";

	const injectableParametersConfig = hasInjectableParameters
		? buildInjectableParamsConfig(operationsWithInjectable)
		: undefined;

	// Domain service aggregate scope
	const domainServiceOps = schema ? getDomainServiceOps(schema) : [];
	const hasDomainServices = domainServiceOps.length > 0;
	const aggregateScopeConfig = hasDomainServices
		? buildAggregateScopeConfig(domainServiceOps)
		: undefined;

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

	// Import User type from the first context's DSL package when auth is required
	const userTypeImport =
		hasAuth && contexts[0]
			? `import type { User } from "${contexts[0].dslPackage}";`
			: "";

	// Build encoding imports
	const encodingImports: string[] = [];
	if (hasEncoding) {
		const codecFactories: string[] = [];
		for (const format of encodingFormats) {
			switch (format) {
				case "json": {
					codecFactories.push(
						`import { createJsonCodec } from "@morphdsl/codec-json-impls";`,
					);
					break;
				}
				case "protobuf": {
					codecFactories.push(
						`import { createProtobufCodec } from "@morphdsl/codec-protobuf-impls";`,
					);
					break;
				}
				case "yaml": {
					codecFactories.push(
						`import { createYamlCodec } from "@morphdsl/codec-yaml-impls";`,
					);
					break;
				}
			}
		}
		encodingImports.push(
			`import { createCodecRegistry } from "@morphdsl/codec-impls";`,
			...codecFactories,
		);
	}

	// Build imports in alphabetical order for lint compliance
	const needsBackendArguments = hasEntities || hasEvents;
	const generatorCliImports = [
		"createCli",
		"createRepl",
		...(needsBackendArguments
			? ["filterBackendArgument", "parseBackendArgument"]
			: []),
		...(hasAuth ? ["promptInput", "promptSecure"] : []),
		...(hasSqlite ? ["runMigrateCli"] : []),
	];
	const imports = sortImports(
		[
			...(hasAuth
				? [
						`import {\n\tAuthenticationError,\n\tverifyPassword,\n} from "@morphdsl/auth-password-impls";`,
					]
				: []),
			...encodingImports,
			`import { ${generatorCliImports.join(", ")} } from "@morphdsl/runtime-cli";`,
			contextImports,
			`import { Effect, Layer, Logger${hasAuth ? ", Ref" : ""}${hasInjectableParameters ? ", Schema as S" : ""} } from "effect";`,
			...(userTypeImport ? [userTypeImport] : []),
			...(hasEntities
				? [`import { parseSeedArguments, runSeed } from "./seed";`]
				: []),
		].join("\n"),
	);

	// Build encoding setup code
	const encodingSetupCode = hasEncoding
		? (() => {
				const codecs = encodingFormats
					.map((f) => {
						switch (f) {
							case "json": {
								return "createJsonCodec()";
							}
							case "protobuf": {
								return "createProtobufCodec()";
							}
							case "yaml": {
								return "createYamlCodec()";
							}
						}
					})
					.join(", ");
				return `\n\tconst codecRegistry = createCodecRegistry(\n\t\t[${codecs}],\n\t\t"${encodingDefault}",\n\t);\n`;
			})()
		: "";

	// Build createCli config properties
	const cliConfigProperties = configProperties([
		aggregateScopeConfig && `aggregateScope: ${aggregateScopeConfig},`,
		hasEncoding && "codecRegistry,",
		`description: "${options.cliDescription ?? ""}",`,
		`envPrefix: "${envPrefix}",`,
		injectableParametersConfig &&
			`injectableParams: ${injectableParametersConfig},`,
		`name: "${options.cliName ?? "cli"}",`,
	]);

	const entryContent = `${imports}
${opsMergeCode}${handlersLayerMergeCode ? `\n${handlersLayerMergeCode}\n` : ""}
const main = Effect.gen(function* () {
	${eventStoreLayerCode}${storageLayerCode}${authLayerCode}
	${appLayerCode}${operationWrapperCode}${encodingSetupCode}
	const cli = createCli(${hasInjectableParameters ? "wrappedOps" : "ops"}, AppLayer, {
${indent(cliConfigProperties.join("\n"), 2)}
	});

	${argvFilterCode}${
		hasEntities
			? `
	if (argv[0] === "seed") {
		const args = parseSeedArguments(argv.slice(1));
		yield* runSeed(args.count, args.seedValue).pipe(Effect.provide(AppLayer));
		return 0;
	}
`
			: ""
	}${
		hasSqlite
			? `
	if (argv[0] === "migrate") {
		yield* runMigrateCli(argv.slice(1), "${envPrefix}");
		return 0;
	}
`
			: ""
	}
	if (argv[0] === "console") {
		yield* Effect.promise(() =>
			createRepl({
				execute: (replArgv) => cli.run(replArgv),
				name: "${options.cliName ?? "cli"}",
			}),
		);
		return 0;
	}

	return yield* Effect.promise(() => cli.run(argv));
});

const code = await Effect.runPromise(main).catch(() => 1);
process.exit(code);
`;

	const entryFile: GeneratedFile = {
		content: entryContent,
		filename: `${prefix}index.ts`,
	};

	// Generate seed file for entity seeding
	const seedContent =
		hasEntities && options.schema
			? generateSeedFile({ contexts, schema: options.schema })
			: undefined;
	const seedFile: GeneratedFile | undefined = seedContent
		? { content: seedContent, filename: `${prefix}seed.ts` }
		: undefined;

	// Generate README with injectable params info
	const injectableMap = new Map(
		operationsWithInjectable.map((op) => [
			op.name,
			op.injectables.map((p) => p.paramName),
		]),
	);
	const readmeFile: GeneratedFile | undefined = options.schema
		? {
				content: generateCliReadme(
					options.schema,
					options.cliName ?? "cli",
					options.cliDescription,
					injectableMap,
				),
				filename: `${packagePrefix}README.md`,
			}
		: undefined;

	const files = [
		entryFile,
		...(seedFile ? [seedFile] : []),
		...(readmeFile ? [readmeFile] : []),
	];
	return { files };
};
