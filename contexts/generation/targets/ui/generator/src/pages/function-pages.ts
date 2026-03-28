/**
 * Function page generation - function page templates.
 */
import type {
	FunctionDef,
	OperationDef,
	QualifiedEntry,
} from "@morph/domain-schema";

import { toKebabCase, toTitleCase } from "@morph/utils";

import { generateFormFields } from "../forms";
import { generateResultDisplay } from "../utilities";

/**
 * Generate a page for a single function.
 */
const generateFunctionPage = (
	function_: QualifiedEntry<FunctionDef>,
	sseOptions: string,
): string => {
	const formFields = generateFormFields(
		{ ...function_, def: function_.def as unknown as OperationDef },
		new Set(),
	);

	return `
/**
 * ${toTitleCase(function_.name)} function page.
 */
export const ${function_.name}Page = (result?: unknown, error?: string): string => layout(
	"${toTitleCase(function_.name)}",
	\`<article>
		<header>
			<h2>${toTitleCase(function_.name)}</h2>
			<p>${function_.def.description}</p>
		</header>
		\${error ? \`<p role="alert" aria-invalid="true">\${error}</p>\` : ""}
		<form hx-post="/functions/${toKebabCase(function_.name)}" hx-target="this" hx-swap="outerHTML">
			${formFields}
			<button type="submit">\${t("function.execute")}</button>
		</form>
		\${result === undefined ? "" : \`<section>
			<h3>\${t("function.result")}</h3>
			${generateResultDisplay(function_.def.output)}
		</section>\`}
	</article>\`,
	nav("/functions/${toKebabCase(function_.name)}")${sseOptions},
);`;
};

/**
 * Generate pages for all functions with @ui tag.
 */
export const generateFunctionPages = (
	functions: readonly QualifiedEntry<FunctionDef>[],
	sseOptions: string,
): readonly string[] =>
	functions
		.filter((function_) => function_.def.tags.includes("@ui"))
		.map((function_) => generateFunctionPage(function_, sseOptions));
