/**
 * Generate operations section.
 */
import type {
	DomainSchema,
	OperationDef,
	QualifiedEntry,
	TypeRef,
} from "@morphdsl/domain-schema";

import { getOperationAggregates, isDomainService } from "@morphdsl/domain-schema";

import { bold, code, codeBlock, heading, table } from "../markdown";

/**
 * Options for generating operations section.
 */
export interface OperationsOptions {
	/**
	 * Generate a usage example for the operation.
	 * Return empty string to skip example.
	 */
	readonly exampleGenerator?: (op: QualifiedEntry<OperationDef>) => string;

	/**
	 * Language for code examples (e.g., "bash", "typescript").
	 */
	readonly exampleLang?: string;

	/**
	 * Heading level for the section (default: 2).
	 */
	readonly headingLevel?: 2 | 3;

	/**
	 * Filter to exclude certain parameters from display.
	 * Return true to include the parameter, false to exclude.
	 */
	readonly parameterFilter?: (opName: string, paramName: string) => boolean;

	/**
	 * Schema for detecting domain services.
	 * When provided, domain services will show aggregate scope.
	 */
	readonly schema?: DomainSchema;
}

/**
 * Format a TypeRef as a readable string.
 */
const formatType = (type: TypeRef): string => {
	switch (type.kind) {
		case "array": {
			return `${formatType(type.element)}[]`;
		}
		case "entity": {
			return type.name;
		}
		case "entityId": {
			return `${type.entity}Id`;
		}
		case "function": {
			return "Function";
		}
		case "generic": {
			const args = type.args.map(formatType).join(", ");
			return `${type.name}<${args}>`;
		}
		case "optional": {
			return `${formatType(type.inner)}?`;
		}
		case "primitive": {
			return type.name;
		}
		case "type": {
			return type.name;
		}
		case "typeParam": {
			return type.name;
		}
		case "union": {
			return type.values.join(" | ");
		}
		case "valueObject": {
			return type.name;
		}
	}
};

/**
 * Generate documentation for a single operation.
 */
const generateOperation = (
	op: QualifiedEntry<OperationDef>,
	options: OperationsOptions,
): string => {
	const opLevel = (options.headingLevel ?? 2) + 1;
	const lines: string[] = [];

	// Operation heading
	lines.push(heading(opLevel as 3 | 4, code(op.name)));

	// Description
	lines.push(op.def.description);

	// Domain service aggregate scope
	if (options.schema && isDomainService(options.schema, op.name)) {
		const aggregates = getOperationAggregates(options.schema, op.name);
		const scope = aggregates
			.map((a) => `${a.aggregate} (${a.access})`)
			.join(", ");
		lines.push(`${bold("Aggregates:")} ${scope}`);
	}

	// Parameters table (filtered by parameterFilter if provided)
	const params = Object.entries(op.def.input).filter(
		([name]) => options.parameterFilter?.(op.name, name) ?? true,
	);
	if (params.length > 0) {
		lines.push(bold("Parameters:"));
		const rows = params.map(([name, param]) => [
			code(name),
			code(formatType(param.type)),
			param.optional ? "No" : "Yes",
			param.description,
		]);
		lines.push(table(["Name", "Type", "Required", "Description"], rows));
	}

	// Returns
	lines.push(`${bold("Returns:")} ${code(formatType(op.def.output))}`);

	// Errors
	if (op.def.errors.length > 0) {
		lines.push(bold("Errors:"));
		const errorList = op.def.errors
			.map((error) => `- ${code(`${error.name}Error`)}: ${error.description}`)
			.join("\n");
		lines.push(errorList);
	}

	// Usage example
	if (options.exampleGenerator) {
		const example = options.exampleGenerator(op);
		if (example) {
			lines.push(bold("Example:"));
			lines.push(codeBlock(example, options.exampleLang ?? ""));
		}
	}

	return lines.join("\n\n");
};

/**
 * Generate the operations section.
 */
export const operations = (
	ops: readonly QualifiedEntry<OperationDef>[],
	options: OperationsOptions = {},
): string => {
	if (ops.length === 0) return "";

	const level = options.headingLevel ?? 2;
	const lines: string[] = [heading(level, "Operations")];

	for (const op of ops) {
		lines.push(generateOperation(op, options));
	}

	return lines.join("\n\n");
};
