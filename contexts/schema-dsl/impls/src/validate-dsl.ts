import type { Effect } from "effect";

import { Context, Effect as E, Layer } from "effect";

import { ParseFailedError } from "@morph/schema-dsl-dsl";
import { compile } from "@morph/schema-dsl-compiler";
import { parse } from "@morph/schema-dsl-parser";

export interface ValidateDslHandler {
	readonly handle: (
		params: { readonly source: string },
		options: Record<string, never>,
	) => Effect.Effect<void, ParseFailedError>;
}

export const ValidateDslHandler = Context.GenericTag<ValidateDslHandler>(
	"@morph/impls/ValidateDslHandler",
);

export const ValidateDslHandlerLive = Layer.succeed(ValidateDslHandler, {
	handle: (params, _options) =>
		E.gen(function* () {
			const parseResult = parse(params.source);

			if (parseResult.errors.length > 0) {
				return yield* E.fail(
					new ParseFailedError({
						message: parseResult.errors
							.map(
								(e) =>
									`${e.range.start.line}:${e.range.start.column}: ${e.message}`,
							)
							.join("\n"),
					}),
				);
			}

			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- parse succeeded
			const compileResult = compile(parseResult.ast!);

			if (compileResult.errors.length > 0) {
				return yield* E.fail(
					new ParseFailedError({
						message: compileResult.errors
							.map(
								(e) =>
									`${e.range.start.line}:${e.range.start.column}: ${e.message}`,
							)
							.join("\n"),
					}),
				);
			}
		}),
});
