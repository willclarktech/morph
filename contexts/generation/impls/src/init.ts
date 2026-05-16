import type { GeneratedFile } from "@morphdsl/domain-schema";
import type { GenerationResult } from "@morphdsl/generation-dsl";

import { init as scaffoldInit } from "@morphdsl/builder-scaffold";
import { Context, Effect } from "effect";

export interface InitHandler {
	readonly handle: (
		params: { readonly name: string },
		options: Record<string, never>,
	) => Effect.Effect<GenerationResult>;
}

export const InitHandler = Context.GenericTag<InitHandler>(
	"@morphdsl/impls/InitHandler",
);

export const init = (
	params: { readonly name: string },
	_options: Record<string, never>,
): GenerationResult => {
	const scaffold = scaffoldInit({ name: params.name });

	const files: GeneratedFile[] = scaffold.files.map((f) => ({
		...f,
		filename: `${params.name}/${f.filename}`,
	}));

	return { files };
};
