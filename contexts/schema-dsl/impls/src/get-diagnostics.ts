import type { DslDiagnostic } from "@morph/schema-dsl-dsl";
import type { Effect } from "effect";

import { compile } from "@morph/schema-dsl-compiler";
import { parse } from "@morph/schema-dsl-parser";
import { Context, Effect as E, Layer } from "effect";

export interface GetDiagnosticsHandler {
	readonly handle: (
		params: { readonly source: string },
		options: Record<string, never>,
	) => Effect.Effect<readonly DslDiagnostic[]>;
}

export const GetDiagnosticsHandler = Context.GenericTag<GetDiagnosticsHandler>(
	"@morph/impls/GetDiagnosticsHandler",
);

export const GetDiagnosticsHandlerLive = Layer.succeed(GetDiagnosticsHandler, {
	handle: (params, _options) =>
		E.sync(() => {
			const parseResult = parse(params.source);
			const diagnostics: DslDiagnostic[] = [];

			for (const error of parseResult.errors) {
				diagnostics.push({
					message: error.message,
					severity: error.severity as "error" | "warning",
					line: error.range.start.line,
					column: error.range.start.column,
					endLine: error.range.end.line,
					endColumn: error.range.end.column,
				});
			}

			if (parseResult.ast) {
				const compileResult = compile(parseResult.ast);
				for (const error of compileResult.errors) {
					diagnostics.push({
						message: error.message,
						severity: "error",
						line: error.range.start.line,
						column: error.range.start.column,
						endLine: error.range.end.line,
						endColumn: error.range.end.column,
					});
				}
			}

			return diagnostics;
		}),
});
