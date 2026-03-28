import type { ParseResult } from "@morph/schema-dsl-dsl";
import type { Effect } from "effect";

import { compile } from "@morph/schema-dsl-compiler";
import { ParseFailedError } from "@morph/schema-dsl-dsl";
import { parse } from "@morph/schema-dsl-parser";
import { Context, Effect as E, Layer } from "effect";

export interface ParseMorphHandler {
	readonly handle: (
		params: { readonly source: string },
		options: Record<string, never>,
	) => Effect.Effect<ParseResult, ParseFailedError>;
}

export const ParseMorphHandler = Context.GenericTag<ParseMorphHandler>(
	"@morph/impls/ParseMorphHandler",
);

export const ParseMorphHandlerLive = Layer.succeed(ParseMorphHandler, {
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

			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- parse succeeded with no errors
			const compileResult = compile(parseResult.ast!);

			const diagnostics = [
				...parseResult.errors.map((error) => ({
					message: error.message,
					severity: error.severity as "error" | "warning",
					line: error.range.start.line,
					column: error.range.start.column,
					endLine: error.range.end.line,
					endColumn: error.range.end.column,
				})),
				...compileResult.errors.map((error) => ({
					message: error.message,
					severity: "error" as const,
					line: error.range.start.line,
					column: error.range.start.column,
					endLine: error.range.end.line,
					endColumn: error.range.end.column,
				})),
			];

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

			return {
				schema: JSON.stringify(compileResult.schema, undefined, "\t"),
				diagnostics,
			};
		}),
});
