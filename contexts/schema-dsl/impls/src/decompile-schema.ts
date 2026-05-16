import type { DomainSchema } from "@morphdsl/domain-schema";

import { decompile } from "@morphdsl/schema-dsl-decompiler";
import { InvalidSchemaError } from "@morphdsl/schema-dsl-dsl";
import { Context, Effect } from "effect";

export interface DecompileSchemaHandler {
	readonly handle: (
		params: { readonly schema: string },
		options: Record<string, never>,
	) => Effect.Effect<string, InvalidSchemaError>;
}

export const DecompileSchemaHandler =
	Context.GenericTag<DecompileSchemaHandler>(
		"@morphdsl/impls/DecompileSchemaHandler",
	);

export const decompileSchema = (
	params: { readonly schema: string },
	_options: Record<string, never>,
): Effect.Effect<string, InvalidSchemaError> =>
	Effect.try({
		try: () => {
			const schema = JSON.parse(params.schema) as DomainSchema;
			return decompile(schema);
		},
		catch: (error) =>
			new InvalidSchemaError({
				message: error instanceof Error ? error.message : "Invalid schema JSON",
			}),
	});
