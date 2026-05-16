import type { InvalidSchemaError } from "@morphdsl/generation-dsl";

import { Context, Effect } from "effect";

import { parseSchemaInput } from "./utils";

export interface ValidateHandler {
	readonly handle: (
		params: { readonly schema: string },
		options: Record<string, never>,
	) => Effect.Effect<void, InvalidSchemaError>;
}

export const ValidateHandler = Context.GenericTag<ValidateHandler>(
	"@morphdsl/impls/ValidateHandler",
);

export const validate = (
	params: { readonly schema: string },
	_options: Record<string, never>,
): Effect.Effect<void, InvalidSchemaError> =>
	parseSchemaInput(params.schema).pipe(Effect.asVoid);
