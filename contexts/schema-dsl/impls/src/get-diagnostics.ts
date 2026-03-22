import type { DslDiagnostic } from "@morph/schema-dsl-dsl";
import type { Effect } from "effect";

import { Context, Effect as E, Layer } from "effect";

import { compile } from "@morph/schema-dsl-compiler";
import { parse } from "@morph/schema-dsl-parser";

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

			for (const e of parseResult.errors) {
				diagnostics.push({
					message: e.message,
					severity: e.severity as "error" | "warning",
					line: e.range.start.line,
					column: e.range.start.column,
					endLine: e.range.end.line,
					endColumn: e.range.end.column,
				});
			}

			if (parseResult.ast) {
				const compileResult = compile(parseResult.ast);
				for (const e of compileResult.errors) {
					diagnostics.push({
						message: e.message,
						severity: "error",
						line: e.range.start.line,
						column: e.range.start.column,
						endLine: e.range.end.line,
						endColumn: e.range.end.column,
					});
				}
			}

			return diagnostics;
		}),
});
