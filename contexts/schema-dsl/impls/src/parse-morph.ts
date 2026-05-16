import type { ParseResult } from "@morphdsl/schema-dsl-dsl";

import { compile } from "@morphdsl/schema-dsl-compiler";
import { ParseFailedError } from "@morphdsl/schema-dsl-dsl";
import { parse } from "@morphdsl/schema-dsl-parser";
import { Context, Effect } from "effect";

export interface ParseMorphHandler {
	readonly handle: (
		params: { readonly source: string },
		options: Record<string, never>,
	) => Effect.Effect<ParseResult, ParseFailedError>;
}

export const ParseMorphHandler = Context.GenericTag<ParseMorphHandler>(
	"@morphdsl/impls/ParseMorphHandler",
);

export const parseMorph = (
	params: { readonly source: string },
	_options: Record<string, never>,
): Effect.Effect<ParseResult, ParseFailedError> =>
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

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- parse succeeded with no errors
		const compileResult = compile(parseResult.ast!);

		const diagnostics = [
			...parseResult.errors.map((error) => ({
				message: error.message,
				severity: error.severity,
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

		return {
			schema: JSON.stringify(compileResult.schema, undefined, "\t"),
			diagnostics,
		};
	});
