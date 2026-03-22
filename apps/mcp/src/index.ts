import {
	HandlersLayer as GenerationHandlersLayer,
	ops as GenerationOps,
} from "@morph/generation-core";
import { createMcp } from "@morph/runtime-mcp";
import {
	HandlersLayer as SchemaDslHandlersLayer,
	ops as SchemaDslOps,
} from "@morph/schema-dsl-core";
import { Effect, Layer, Logger } from "effect";

// Merge operations from all contexts with prefixes
const ops = {
	...Object.fromEntries(
		Object.entries(GenerationOps).map(([k, v]) => [`generation_${k}`, v]),
	),
	...Object.fromEntries(
		Object.entries(SchemaDslOps).map(([k, v]) => [`schema_dsl_${k}`, v]),
	),
};

const HandlersLayer = Layer.mergeAll(
	GenerationHandlersLayer,
	SchemaDslHandlersLayer,
);

// MCP uses stdout for JSON-RPC, so redirect logs to stderr
const StderrLogger = Logger.replace(
	Logger.defaultLogger,
	Logger.prettyLogger({ stderr: true }),
);

const main = Effect.gen(function* () {
	const AppLayer = Layer.mergeAll(HandlersLayer, StderrLogger);

	const mcp = createMcp(ops, AppLayer, {
		name: "Morph",
		version: "1.0.0",
	});

	yield* Effect.promise(() => mcp.start());

	// Graceful shutdown on SIGTERM/SIGINT (12-factor: disposability)
	const shutdown = () => {
		console.error("MCP server shutting down...");
		mcp
			.stop()
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
