import type { Diagnostic } from "@codemirror/lint";
import type { Extension } from "@codemirror/state";

import { linter } from "@codemirror/lint";
import { parse } from "@morphdsl/schema-dsl-parser";
import { compile } from "@morphdsl/schema-dsl-compiler";

export const morphLinter = (): Extension =>
	linter((view) => {
		const source = view.state.doc.toString();
		const diagnostics: Diagnostic[] = [];

		const parseResult = parse(source);
		for (const error of parseResult.errors) {
			const from = view.state.doc.line(Math.max(1, error.range.start.line)).from +
				Math.max(0, error.range.start.column - 1);
			const toLine = Math.max(1, error.range.end.line);
			const to = Math.min(
				view.state.doc.length,
				view.state.doc.line(Math.min(toLine, view.state.doc.lines)).from +
					Math.max(0, error.range.end.column - 1),
			);
			diagnostics.push({
				from: Math.min(from, view.state.doc.length),
				to: Math.max(from, to),
				severity: error.severity === "warning" ? "warning" : "error",
				message: error.message,
			});
		}

		if (parseResult.ast && parseResult.errors.length === 0) {
			const compileResult = compile(parseResult.ast);
			for (const error of compileResult.errors) {
				const from = view.state.doc.line(Math.max(1, error.range.start.line)).from +
					Math.max(0, error.range.start.column - 1);
				const toLine = Math.max(1, error.range.end.line);
				const to = Math.min(
					view.state.doc.length,
					view.state.doc.line(Math.min(toLine, view.state.doc.lines)).from +
						Math.max(0, error.range.end.column - 1),
				);
				diagnostics.push({
					from: Math.min(from, view.state.doc.length),
					to: Math.max(from, to),
					severity: "error",
					message: error.message,
				});
			}
		}

		return diagnostics;
	}, { delay: 500 });
