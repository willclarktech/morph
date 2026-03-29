import type {
	DomainSchema,
	OperationDef,
	QualifiedEntry,
} from "@morphdsl/domain-schema";

import {
	getAllEntities,
	getAllOperations,
	getInjectableParams,
} from "@morphdsl/domain-schema";
import { indent, pluralize } from "@morphdsl/utils";

/**
 * Generate injectable params config for UI test runner.
 * Returns config entry if any operations have injectable params.
 */
export const generateInjectableParamsConfig = (
	schema: DomainSchema,
): string => {
	const operations = getAllOperations(schema).filter((op) =>
		op.def.tags.includes("@ui"),
	);

	const entries: string[] = [];
	for (const op of operations) {
		const params = getInjectableParams(schema, op.name);
		if (params.length > 0) {
			const paramNames = params.map((p) => `"${p.paramName}"`).join(", ");
			entries.push(`${op.name}: [${paramNames}],`);
		}
	}

	if (entries.length === 0) {
		return "";
	}

	return `
	injectableParams: {
${indent(entries.join("\n"), 2)}
	},`;
};

/**
 * Detect if an operation is a registration operation (createUser with password).
 */
const isRegistrationOp = (op: QualifiedEntry<OperationDef>): boolean => {
	const nameLower = op.name.toLowerCase();
	if (!nameLower.includes("user")) return false;
	if (!nameLower.startsWith("create") && !nameLower.startsWith("register"))
		return false;
	// Has a sensitive (password) field
	return Object.values(op.def.input).some((param) => param.sensitive === true);
};

/**
 * Generate UI mappings from schema operations.
 * Maps each operation to UI interactions (forms, navigation, etc.).
 */
export const generateUiMappings = (schema: DomainSchema): string => {
	const allOperations = getAllOperations(schema).filter((op) =>
		op.def.tags.includes("@ui"),
	);
	const allEntities = getAllEntities(schema);

	const mappings: string[] = [];

	for (const op of allOperations) {
		// Registration operations use /register route
		const isRegister = isRegistrationOp(op);
		const mapping = inferUiMapping(op, allEntities, isRegister);
		if (mapping) {
			mappings.push(`${op.name}: ${mapping}`);
		}
	}

	if (mappings.length === 0) {
		return "{}";
	}

	return `{\n${indent(mappings.join(",\n"), 2)}\n\t}`;
};

/**
 * Infer UI mapping for an operation based on naming conventions.
 */
const inferUiMapping = (
	op: QualifiedEntry<OperationDef>,
	allEntities: readonly { readonly name: string }[],
	isRegister = false,
): string | undefined => {
	const name = op.name;

	// Find the entity this operation relates to
	const entity = allEntities.find((ent) =>
		name.toLowerCase().includes(ent.name.toLowerCase()),
	);
	if (!entity) return undefined;

	const entityName = entity.name;
	const plural = pluralize(entityName.toLowerCase());

	// Get non-sensitive, non-id input fields for forms
	const formFields = Object.entries(op.def.input)
		.filter(
			([fieldName, field]) =>
				!field.sensitive &&
				fieldName !== "id" &&
				fieldName !== `${entityName.toLowerCase()}Id`,
		)
		.map(([fieldName]) => fieldName);

	if (name.startsWith("create") || name.startsWith("add")) {
		// Registration uses /register route, creates session on redirect
		if (isRegister) {
			const fieldLines = [
				...formFields.map((f) => `${f}: "#${f}"`),
				// Add password field for registration (it's not in formFields because it's sensitive)
				`password: "#password"`,
			];
			const fieldsStr = indent(fieldLines.join(",\n"), 4);
			return String.raw`{
			form: {
				fields: {
${fieldsStr}
				},
				route: "/register",
				submitButton: "button[type=\"submit\"]",
			},
		}`;
		}
		// Create operation: fill form, submit, extract from detail page <dl>
		const fieldsStr = indent(
			formFields.map((f) => `${f}: "#${f}"`).join(",\n"),
			4,
		);
		return String.raw`{
			form: {
				fields: {
${fieldsStr}
				},
				route: "/${plural}/new",
				submitButton: "button[type=\"submit\"]",
			},
			extractResult: {
				selector: "article dl",
				type: "dl",
			},
		}`;
	}

	if (name.startsWith("list") || name.startsWith("getAll")) {
		// List operation: navigate to list page and extract table rows
		return `{
			navigateTo: "/${plural}",
			extractResult: {
				columns: {},
				rowSelector: "#${entityName.toLowerCase()}-list tr",
				type: "table",
			},
		}`;
	}

	if (
		(name.startsWith("get") && !name.startsWith("getAll")) ||
		name.startsWith("find")
	) {
		// Get single: navigate to detail page, extract from <dl>
		return `{
			navigateTo: "/${plural}/{id}",
			extractResult: {
				selector: "article dl",
				type: "dl",
			},
		}`;
	}

	if (name.startsWith("update") || name.startsWith("edit")) {
		// Update operation: navigate to edit page, fill form, submit
		const fieldsStr = indent(
			formFields.map((f) => `${f}: "#${f}"`).join(",\n"),
			4,
		);
		return String.raw`{
			form: {
				fields: {
${fieldsStr}
				},
				route: "/${plural}/{id}/edit",
				submitButton: "button[type=\"submit\"]",
			},
		}`;
	}

	if (name.startsWith("delete") || name.startsWith("remove")) {
		// Delete operation: click delete button on detail page
		// No waitFor — runner handles redirects via waitForURL + waitForLoadState
		return `{
			navigateTo: "/${plural}/{id}",
			click: {
				selector: "button.contrast",
			},
		}`;
	}

	if (name.startsWith("complete") || name.startsWith("toggle")) {
		// Toggle/complete operation: click checkbox or button, extract result from detail page
		return String.raw`{
			navigateTo: "/${plural}/{id}",
			click: {
				selector: "input[type=\"checkbox\"], button.complete",
			},
			extractResult: {
				selector: "article dl",
				type: "dl",
			},
		}`;
	}

	return undefined;
};
