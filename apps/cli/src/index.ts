import {
	HandlersLayer as GenerationHandlersLayer,
	ops as GenerationOps,
} from "@morph/generation-core";
import {
	createCli,
	createRepl,
	filterBackendArg,
	parseBackendArg,
} from "@morph/runtime-cli";
import {
	HandlersLayer as SchemaDslHandlersLayer,
	ops as SchemaDslOps,
} from "@morph/schema-dsl-core";
import { Effect, Layer, Logger } from "effect";

// Merge operations from all contexts with prefixes
const ops = {
	...Object.fromEntries(
		Object.entries(GenerationOps).map(([k, v]) => [`generation:${k}`, v]),
	),
	...Object.fromEntries(
		Object.entries(SchemaDslOps).map(([k, v]) => [`schema-dsl:${k}`, v]),
	),
};

const HandlersLayer = Layer.mergeAll(
	GenerationHandlersLayer,
	SchemaDslHandlersLayer,
);

const main = Effect.gen(function* () {
	// Use stderr logger to keep stdout clean for JSON output
	const stderrLogger = Logger.replace(
		Logger.defaultLogger,
		Logger.make(({ message }) => {
			const text =
				typeof message === "string" ? message : JSON.stringify(message);
			console.error(text);
		}),
	);

	const AppLayer = Layer.mergeAll(HandlersLayer, stderrLogger);
	const cli = createCli(ops, AppLayer, {
		description: "",
		envPrefix: "MORPH",
		name: "morph",
	});

	const argv = process.argv.slice(2);
	if (argv[0] === "console") {
		yield* Effect.promise(() =>
			createRepl({
				execute: (replArgv) => cli.run(replArgv),
				name: "morph",
			}),
		);
		return 0;
	}

	return yield* Effect.promise(() => cli.run(argv));
});

const code = await Effect.runPromise(main).catch(() => 1);
process.exit(code);
