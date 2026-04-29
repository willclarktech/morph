// Type stubs for generation packages so the site's tsc doesn't have to walk
// into the full impls/operations source tree (which has cross-package types
// that don't always type-check cleanly under the browser tsconfig).
// Bundler still uses the real implementations.

declare module "@morphdsl/generation-impls" {
	import type { DomainSchema, GeneratedFile } from "@morphdsl/domain-schema";
	import type { Effect } from "effect";

	export const executeGenerate: (
		schema: DomainSchema,
		name: string,
	) => Effect.Effect<{ files: GeneratedFile[] }>;
}

declare module "@morphdsl/generation-core" {
	import type { GeneratedFile } from "@morphdsl/domain-schema";
	import type { Context, Effect, Layer } from "effect";

	type AnyOptionsSchema = unknown;
	type AnyParamsSchema = unknown;

	interface Operation<Params, Options, R> {
		readonly name: string;
		readonly execute: (params: Params, options: Options) => R;
		readonly params: AnyParamsSchema;
		readonly options: AnyOptionsSchema;
	}

	export const HandlersLayer: Layer.Layer<unknown>;

	export const ops: {
		readonly newProject: Operation<
			{ readonly name: string; readonly schema: string },
			Record<string, never>,
			Effect.Effect<
				{ files: readonly GeneratedFile[] },
				never,
				Context.Tag<unknown, unknown>
			>
		>;
	};
}
