import type { GeneratedFile } from "@morphdsl/domain-schema";
import type { GenerationResult } from "@morphdsl/generation-dsl";
import type { Effect } from "effect";

import { init as scaffoldInit } from "@morphdsl/builder-scaffold";
import { Context, Effect as E, Layer } from "effect";

export interface InitHandler {
	readonly handle: (
		params: { readonly name: string },
		options: Record<string, never>,
	) => Effect.Effect<GenerationResult>;
}

export const InitHandler = Context.GenericTag<InitHandler>(
	"@morphdsl/impls/InitHandler",
);

export const InitHandlerLive = Layer.succeed(InitHandler, {
	handle: (params, _options) =>
		E.gen(function* () {
			const scaffold = yield* E.promise(() =>
				scaffoldInit({ name: params.name }),
			);

			const files: GeneratedFile[] = scaffold.files.map((f) => ({
				...f,
				filename: `${params.name}/${f.filename}`,
			}));

			return { files };
		}),
});
