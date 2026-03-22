import type {
	DomainSchema,
	FunctionDef,
	TypeDef,
	TypeRef,
} from "@morph/domain-schema";

import { getAllFunctions, getAllTypes } from "@morph/domain-schema";

const renderTypeRef = (typeRef: TypeRef): string => {
	switch (typeRef.kind) {
		case "array": {
			return `${renderTypeRef(typeRef.element)}[]`;
		}
		case "entity": {
			return typeRef.name;
		}
		case "entityId": {
			return `${typeRef.entity}Id`;
		}
		case "optional": {
			return `${renderTypeRef(typeRef.inner)}?`;
		}
		case "primitive": {
			return typeRef.name;
		}
		case "type": {
			return typeRef.name;
		}
		case "union": {
			return typeRef.values.map((m: string) => `"${m}"`).join(" | ");
		}
		case "valueObject": {
			return typeRef.name;
		}
		case "generic": {
			const args = typeRef.args.map(renderTypeRef).join(", ");
			return `${typeRef.name}<${args}>`;
		}
		case "typeParam": {
			return typeRef.name;
		}
		case "function": {
			return "Function";
		}
	}
};

const renderTypeClass = (name: string, def: TypeDef): string[] => {
	const lines: string[] = [];

	if (def.kind === "product") {
		lines.push(`    class \`📋 ${name}\` {`);
		lines.push(`        <<type>>`);
		for (const [fieldName, field] of Object.entries(def.fields)) {
			const fieldType = renderTypeRef(field.type);
			lines.push(`        ${fieldType} ${fieldName}`);
		}
		lines.push(`    }`);
	} else if (def.kind === "sum") {
		lines.push(`    class \`📋 ${name}\` {`);
		lines.push(`        <<union>>`);
		for (const variantName of Object.keys(def.variants)) {
			lines.push(`        ${variantName}`);
		}
		lines.push(`    }`);
	}

	return lines;
};

const renderFunctionClass = (name: string, def: FunctionDef): string[] => {
	const lines: string[] = [];

	lines.push(`    class \`⚡ ${name}\` {`);
	lines.push(`        <<function>>`);

	// Input parameters
	const inputParameters = Object.entries(def.input)
		.map(([pName, p]) => `${pName}: ${renderTypeRef(p.type)}`)
		.join(", ");
	lines.push(`        input: ${inputParameters || "void"}`);

	// Output
	const outputType = renderTypeRef(def.output);
	lines.push(`        output: ${outputType}`);

	lines.push(`    }`);

	return lines;
};

export const generateTypesDiagram = (
	schema: DomainSchema,
): string | undefined => {
	const types = getAllTypes(schema);
	const functions = getAllFunctions(schema);

	if (types.length === 0 && functions.length === 0) {
		return undefined;
	}

	const lines: string[] = ["classDiagram"];

	// Render types
	if (types.length > 0) {
		lines.push("");
		lines.push("    %% Types");
		for (const t of types) {
			lines.push(...renderTypeClass(t.name, t.def));
		}
	}

	// Render functions
	if (functions.length > 0) {
		lines.push("");
		lines.push("    %% Functions");
		for (const f of functions) {
			lines.push(...renderFunctionClass(f.name, f.def));
		}
	}

	return lines.join("\n");
};
