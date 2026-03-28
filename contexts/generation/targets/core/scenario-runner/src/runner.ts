import type { Operations, Prose, Runner } from "@morph/scenario-runner";
import type { Runtime as EffectRuntime } from "effect";

import { createRunner } from "@morph/scenario-runner";
import { Effect, Layer } from "effect";

export interface LibraryRunnerConfig<R> {
	readonly layer: Layer.Layer<R>;
	readonly operations: Operations<R>;
	readonly prose?: Prose;
	readonly reset?: "fresh" | "none";
}

export const createLibraryRunner = <R>(
	config: LibraryRunnerConfig<R>,
): Runner => {
	const resetStrategy = config.reset ?? "fresh";

	const createRuntime = (): EffectRuntime.Runtime<R> =>
		Effect.runSync(Effect.runtime<R>().pipe(Effect.provide(config.layer)));

	let currentRuntime: EffectRuntime.Runtime<R> | undefined;

	return createRunner(
		{
			execute: async (name, params) => {
				currentRuntime ??= createRuntime();
				const operation = config.operations[name];
				if (!operation) {
					throw new Error(`Unknown operation: ${name}`);
				}
				const effect = operation(params);
				const result = await Effect.runPromise(
					effect.pipe(
						Effect.provide(Layer.succeedContext(currentRuntime.context)),
					),
				);
				return { result };
			},
			prose: config.prose,
		},
		resetStrategy === "fresh"
			? {
					reset: () => {
						currentRuntime = undefined;
					},
				}
			: undefined,
	);
};
