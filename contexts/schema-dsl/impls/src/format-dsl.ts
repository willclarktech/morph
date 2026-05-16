import { compile } from "@morphdsl/schema-dsl-compiler";
import { decompile } from "@morphdsl/schema-dsl-decompiler";
import { ParseFailedError } from "@morphdsl/schema-dsl-dsl";
import { parse } from "@morphdsl/schema-dsl-parser";
import { Context, Effect } from "effect";

export interface FormatDslHandler {
	readonly handle: (
		params: { readonly source: string },
		options: Record<string, never>,
	) => Effect.Effect<string, ParseFailedError>;
}

export const FormatDslHandler = Context.GenericTag<FormatDslHandler>(
	"@morphdsl/impls/FormatDslHandler",
);

export const formatDsl = (
	params: { readonly source: string },
	_options: Record<string, never>,
): Effect.Effect<string, ParseFailedError> =>
	Effect.gen(function* () {
		const parseResult = parse(params.source);

		if (parseResult.errors.length > 0) {
			return yield* Effect.fail(
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
			return yield* Effect.fail(
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
	});
