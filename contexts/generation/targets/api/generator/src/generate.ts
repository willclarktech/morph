/**
 * API app code generation.
 */
import type {
	DomainSchema,
	GeneratedFile,
	GenerationResult,
} from "@morph/domain-schema";

import {
	buildAuthImports,
	buildAuthSetup,
	buildCoreImports,
	buildEncodingImport,
	buildEncodingSetup,
	buildEventStoreSetup,
	buildInjectableParametersCode,
	buildLayerSetup,
	buildLoginRouteSetup,
	buildSseEventWiring,
	buildSseRuntimeSetup,
	buildSseSetup,
	buildStorageLayerSetup,
} from "./code-snippets";
import { configProps, indent, sep, sortImports } from "@morph/utils";

import { detectFeatures } from "./feature-detection";
import { generateApiReadme } from "./readme";

/**
 * Options for generating an API app.
 */
export interface GenerateApiAppOptions {
	/** API description */
	readonly apiDescription?: string;
	/** API name (e.g., "pastebin-api") */
	readonly apiName?: string;
	/** Import path to the core package */
	readonly corePackagePath: string;
	/** DSL package path (for types, inferred from core if not specified) */
	readonly dslPackagePath?: string;
	/** Env var prefix (e.g., "TODO_APP" -> TODO_APP_STORAGE) */
	readonly envPrefix?: string;
	/** Package directory (e.g., "apps/api") */
	readonly packageDir?: string;
	/** Domain schema for feature detection */
	readonly schema?: DomainSchema;
	/** Source directory (default: "src") */
	readonly sourceDir?: string;
}

/**
 * Generate an API app entry point.
 * Mirrors the pattern used by @morph/runtime-cli's generate().
 */
export const generate = (options: GenerateApiAppOptions): GenerationResult => {
	const packageDir = options.packageDir ?? "apps/api";
	const sourceDir = options.sourceDir ?? "src";
	const prefix = `${packageDir}/${sourceDir}/`;
	const corePath = options.corePackagePath;
	const apiName = options.apiName ?? "api";
	const envPrefix = options.envPrefix ?? "APP";

	// Detect features from schema
	const features = detectFeatures(options.schema);

	// Schema export name for importing from schema.ts wrapper
	const schemaExportName = options.schema
		? `${options.schema.name.toLowerCase()}Schema`
		: "schema";

	// DSL package path for schema import (use provided or derive from core path)
	const dslPath = options.dslPackagePath ?? corePath.replace("-core", "-dsl");

	// Build code snippets
	const coreImports = buildCoreImports(features).join(sep(1, ","));
	const layerSetup = buildLayerSetup(features);
	const eventStoreSetup = buildEventStoreSetup(features, envPrefix);
	const storageLayerSetup = buildStorageLayerSetup(features, envPrefix);
	const { authImport, passwordAuthImport, sseImport } = buildAuthImports(
		features,
		dslPath,
	);
	const authSetup = buildAuthSetup(features);
	const loginRouteSetup = buildLoginRouteSetup(features);
	const sseSetup = buildSseSetup(features);
	const sseRuntimeSetup = buildSseRuntimeSetup(features);
	const sseEventWiring = buildSseEventWiring(features);
	const injectableParametersCode = buildInjectableParametersCode(features);
	const encodingImport = buildEncodingImport(features);
	const encodingSetup = buildEncodingSetup(features);

	// Build createApi config properties
	const apiConfigProps = configProps([
		features.hasAuth && "auth: authStrategy,",
		features.hasAuth && "authServiceTag: AuthService,",
		`basePath: "/api",`,
		features.hasEncoding && "codecRegistry,",
		features.hasPasswordAuth && "customRoutes,",
		features.hasInjectableParameters && "injectableParams,",
		`name: "${apiName}",`,
		"openapiSpec,",
		`port: Number(process.env["PORT"] ?? 3000),`,
		(features.hasPasswordAuth || features.hasSseWiring) &&
			"runtime: appRuntime,",
		`schema: ${schemaExportName},`,
		features.hasEvents && "sse: { enabled: true },",
		features.hasEvents && "sseManager,",
	]);

	// Build Effect imports
	const effectImports = [
		"Effect",
		...(features.hasEntities || features.hasEvents ? ["Layer"] : []),
		...(features.hasPasswordAuth || features.hasSseWiring
			? ["ManagedRuntime"]
			: []),
	].join(", ");

	const importBlock = sortImports(
		[
			`import { createApi } from "@morph/runtime-api";`,
			`import {\n\t${coreImports},\n} from "${corePath}";`,
			`import { ${effectImports} } from "effect";`,
			`import { ${schemaExportName} } from "${dslPath}";`,
			authImport.trim(),
			encodingImport.trim(),
			passwordAuthImport.trim(),
			sseImport.trim(),
		]
			.filter(Boolean)
			.join("\n"),
	);

	const entryContent = `${importBlock}

// Load OpenAPI spec from package root
const openapiSpec: unknown = await Bun.file(new URL("../openapi.json", import.meta.url)).json();
${injectableParametersCode}

const main = Effect.gen(function* () {
	${eventStoreSetup}${storageLayerSetup}
	${layerSetup}
${sseSetup}${sseRuntimeSetup}${authSetup}${loginRouteSetup}${encodingSetup}
	const api = createApi(ops, AppLayer, {
${indent(apiConfigProps.join("\n"), 2)}
	});
${sseEventWiring}
	const { stop } = yield* api.start();

	// Graceful shutdown on SIGTERM/SIGINT (12-factor: disposability)
	const shutdown = () => {
		void stop().then(() => {
			// eslint-disable-next-line unicorn/no-process-exit -- Graceful shutdown
			process.exit(0);
		});
	};
	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);

	// Keep server running
	yield* Effect.never;
});

await Effect.runPromise(main).catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	// eslint-disable-next-line unicorn/no-process-exit -- Avoid noisy unhandled rejection stacktrace
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
				content: generateApiReadme(
					options.schema,
					apiName,
					options.apiDescription,
				),
				filename: `${packageDir}/README.md`,
			}
		: undefined;

	return { files: readmeFile ? [entryFile, readmeFile] : [entryFile] };
};
