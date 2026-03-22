import type { ParseResult } from "@morph/schema-dsl-dsl";
import type { Effect } from "effect";

import { Context, Effect as E, Layer } from "effect";

import { ParseFailedError } from "@morph/schema-dsl-dsl";
import { compile } from "@morph/schema-dsl-compiler";
import { parse } from "@morph/schema-dsl-parser";

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
								(e) =>
									`${e.range.start.line}:${e.range.start.column}: ${e.message}`,
							)
							.join("\n"),
					}),
				);
			}

			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- parse succeeded with no errors
			const compileResult = compile(parseResult.ast!);

			const diagnostics = [
				...parseResult.errors.map((e) => ({
					message: e.message,
					severity: e.severity as "error" | "warning",
					line: e.range.start.line,
					column: e.range.start.column,
					endLine: e.range.end.line,
					endColumn: e.range.end.column,
				})),
				...compileResult.errors.map((e) => ({
					message: e.message,
					severity: "error" as const,
					line: e.range.start.line,
					column: e.range.start.column,
					endLine: e.range.end.line,
					endColumn: e.range.end.column,
				})),
			];

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

			return {
				schema: JSON.stringify(compileResult.schema, undefined, "\t"),
				diagnostics,
			};
		}),
});
