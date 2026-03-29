/**
 * Form generation for UI.
 */
import type { OperationDef, QualifiedEntry } from "@morphdsl/domain-schema";

import { separator, toTitleCase } from "@morphdsl/utils";

import { typeRefToInputType } from "./utilities";

/**
 * Generate form fields from operation input.
 * Injectable params (auto-filled from auth context) are filtered out.
 * When entityKey is provided, field labels and help text use translation keys.
 */
export const generateFormFields = (
	op: QualifiedEntry<OperationDef>,
	injectableParamNames: Set<string> = new Set(),
	entityKey?: string,
): string => {
	const allFields = Object.entries(op.def.input).filter(
		([name]) => !injectableParamNames.has(name),
	);

	if (allFields.length === 0) return "// No input fields";

	// Sort: required fields first, optional fields last (stable sort)
	const fields = [...allFields].sort((a, b) => {
		const aOpt = a[1].optional ? 1 : 0;
		const bOpt = b[1].optional ? 1 : 0;
		return aOpt - bOpt;
	});

	return fields
		.map(([name, param]) => {
			const inputType = typeRefToInputType(param.type, name, param.sensitive);
			const label = entityKey
				? `\${t("field.${entityKey}.${name}")}`
				: toTitleCase(name);
			const required = !param.optional;
			const optionalSuffix = entityKey
				? ` (\${t("form.optional")})`
				: " (optional)";
			const describedBy = param.description
				? `aria-describedby="${name}-help"`
				: "";
			const helpText =
				param.description && entityKey
					? `\${t("help.${entityKey}.${name}")}`
					: param.description;

			if (inputType === "checkbox") {
				return `
	<label>
		<input type="checkbox" name="${name}" id="${name}" role="switch">
		${label}
	</label>`;
			}

			if (inputType === "select" && param.type.kind === "union") {
				const selectPlaceholder = entityKey
					? `\${t("form.selectPlaceholder")}`
					: "Select...";
				const options = param.type.values
					.map((v) => `<option value="${v}">${v}</option>`)
					.join(separator(3));
				return `
	<label for="${name}">${label}${required ? "" : optionalSuffix}</label>
	<select name="${name}" id="${name}"${required ? " required" : ""} ${describedBy}>
		<option value="">${selectPlaceholder}</option>
		${options}
	</select>${helpText ? `\n\t<small id="${name}-help">${helpText}</small>` : ""}`;
			}

			return `
	<label for="${name}">${label}${required ? "" : optionalSuffix}</label>
	<input type="${inputType}" name="${name}" id="${name}"${required ? " required" : ""} ${describedBy}>${helpText ? `\n\t<small id="${name}-help">${helpText}</small>` : ""}`;
		})
		.join("\n");
};
