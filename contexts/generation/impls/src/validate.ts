import type { InvalidSchemaError } from "@morph/generation-dsl";
import type { Effect } from "effect";

import { Context, Effect as E, Layer } from "effect";

import { parseSchemaInput } from "./utils";

export interface ValidateHandler {
	readonly handle: (
		params: { readonly schema: string },
		options: Record<string, never>,
	) => Effect.Effect<void, InvalidSchemaError>;
}

export const ValidateHandler = Context.GenericTag<ValidateHandler>(
	"@morph/impls/ValidateHandler",
);

export const ValidateHandlerLive = Layer.succeed(ValidateHandler, {
	handle: (params, _options) => parseSchemaInput(params.schema).pipe(E.asVoid),
});
