import type { DomainSchema } from "@morph/domain-schema";
import type { Effect } from "effect";

import { Context, Effect as E, Layer } from "effect";

import { InvalidSchemaError } from "@morph/schema-dsl-dsl";
import { decompile } from "@morph/schema-dsl-decompiler";

export interface DecompileSchemaHandler {
	readonly handle: (
		params: { readonly schema: string },
		options: Record<string, never>,
	) => Effect.Effect<string, InvalidSchemaError>;
}

export const DecompileSchemaHandler =
	Context.GenericTag<DecompileSchemaHandler>(
		"@morph/impls/DecompileSchemaHandler",
	);

export const DecompileSchemaHandlerLive = Layer.succeed(
	DecompileSchemaHandler,
	{
		handle: (params, _options) =>
			E.try({
				try: () => {
					const schema = JSON.parse(params.schema) as DomainSchema;
					return decompile(schema);
				},
				catch: (error) =>
					new InvalidSchemaError({
						message:
							error instanceof Error ? error.message : "Invalid schema JSON",
					}),
			}),
	},
);
