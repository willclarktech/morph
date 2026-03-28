import type { Effect } from "effect";

import { compile } from "@morph/schema-dsl-compiler";
import { decompile } from "@morph/schema-dsl-decompiler";
import { ParseFailedError } from "@morph/schema-dsl-dsl";
import { parse } from "@morph/schema-dsl-parser";
import { Context, Effect as E, Layer } from "effect";

export interface FormatDslHandler {
	readonly handle: (
		params: { readonly source: string },
		options: Record<string, never>,
	) => Effect.Effect<string, ParseFailedError>;
}

export const FormatDslHandler = Context.GenericTag<FormatDslHandler>(
	"@morph/impls/FormatDslHandler",
);

export const FormatDslHandlerLive = Layer.succeed(FormatDslHandler, {
	handle: (params, _options) =>
		E.gen(function* () {
			const parseResult = parse(params.source);

			if (parseResult.errors.length > 0) {
				return yield* E.fail(
					new ParseFailedError({
						message: parseResult.errors
							.map(
								(error) =>
									`${error.range.start.line}:${error.range.start.column}: ${error.message}`,
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
								(error) =>
									`${error.range.start.line}:${error.range.start.column}: ${error.message}`,
							)
							.join("\n"),
					}),
				);
			}

			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- compile succeeded
			return decompile(compileResult.schema!);
		}),
});
