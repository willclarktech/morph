/**
 * Invariant validator code generation.
 */
import type {
	DomainSchema,
	GeneratedFile,
	InvariantDef,
} from "@morph/domain-schema";

import { getAllInvariants } from "@morph/domain-schema";
import { toCamelCase, toKebabCase } from "@morph/utils";

import { compileCondition } from "./compiler";
import { inferContextFields, inferInputFields } from "./context";
import { conditionReferencesInput } from "./inference";

/**
 * Generate a validator function for a single entity-scoped invariant.
 */
const generateEntityInvariantValidatorCode = (
	invariant: InvariantDef,
	entityName: string,
): { code: string; entityImports: readonly string[] } => {
	const functionName = `validate${invariant.name}`;
	const entityVariable = toCamelCase(entityName);

	// Infer context fields from the condition
	const contextFields = inferContextFields(invariant.condition);

	// Build context type with inferred element types
	const contextType =
		contextFields.length > 0
			? `{ ${contextFields
					.map((f) =>
						f.isCollection
							? `readonly ${f.name}: readonly ${f.elementType}[]`
							: `readonly ${f.name}: ${f.elementType}`,
					)
					.join("; ")} }`
			: "Record<string, never>";

	const compiledCondition = compileCondition(
		invariant.condition,
		entityVariable,
		"context",
	);

	const contextParam = contextFields.length > 0 ? "context" : "_context";

	const code = `/**
 * ${invariant.description}
 */
export const ${functionName} = (
	${entityVariable}: ${entityName},
	${contextParam}: ${contextType},
): Effect.Effect<void, InvariantViolation> =>
	Effect.gen(function* () {
		const valid = ${compiledCondition};
		if (!valid) {
			return yield* Effect.fail(
				new InvariantViolation({
					invariant: "${invariant.name}",
					message: "${invariant.violation}",
					entity: "${entityName}",
					entityId: ${entityVariable}.id,
				}),
			);
		}
	});
`;

	return { code, entityImports: [entityName] };
};

/**
 * Generate a validator function for a context-scoped invariant.
 * Context-scoped invariants check execution context (e.g., authentication).
 */
const generateContextInvariantValidatorCode = (
	invariant: InvariantDef,
): { code: string; entityImports: readonly string[]; needsInput: boolean } => {
	const functionName = `validate${invariant.name}`;
	const needsInput = conditionReferencesInput(invariant.condition);

	// Infer context fields from the condition
	const contextFields = inferContextFields(invariant.condition);

	// Build context type with inferred element types
	const contextType =
		contextFields.length > 0
			? `{ ${contextFields
					.map((f) =>
						f.isCollection
							? `readonly ${f.name}: readonly ${f.elementType}[]`
							: `readonly ${f.name}: ${f.elementType}`,
					)
					.join("; ")} }`
			: "Record<string, never>";

	const compiledCondition = compileCondition(
		invariant.condition,
		"_entity", // Not used for context-scoped
		"context",
	);

	// If the invariant references input fields, add input parameter with inferred type
	const inputFields = needsInput ? inferInputFields(invariant.condition) : [];
	const inputType =
		inputFields.length > 0
			? `{ ${inputFields.map((f) => `readonly ${f}: unknown`).join("; ")} }`
			: "Record<string, unknown>";
	const inputParam = needsInput ? `input: ${inputType},\n\t` : "";

	const code = `/**
 * ${invariant.description}
 */
export const ${functionName} = (
	${inputParam}context: ${contextType},
): Effect.Effect<void, InvariantViolation> =>
	Effect.gen(function* () {
		const valid = ${compiledCondition};
		if (!valid) {
			return yield* Effect.fail(
				new InvariantViolation({
					invariant: "${invariant.name}",
					message: "${invariant.violation}",
				}),
			);
		}
	});
`;

	return { code, entityImports: [], needsInput };
};

/**
 * Generate a validator function for a single invariant.
 */
const generateInvariantValidatorCode = (
	invariant: InvariantDef,
	_typesImportPath: string,
): {
	code: string;
	entityImports: readonly string[];
	needsInvariantContext: boolean;
} => {
	// Handle different scope types
	if (invariant.scope.kind === "entity") {
		const result = generateEntityInvariantValidatorCode(
			invariant,
			invariant.scope.entity,
		);
		return { ...result, needsInvariantContext: false };
	}

	if (invariant.scope.kind === "context") {
		const result = generateContextInvariantValidatorCode(invariant);
		// Context type is now inferred inline, no need for InvariantContext import
		return { ...result, needsInvariantContext: false };
	}

	// Other scope types not yet supported
	return { code: "", entityImports: [], needsInvariantContext: false };
};

/**
 * Generate a single invariant validator file.
 */
const generateInvariantValidatorFile = (
	invariant: InvariantDef,
	typesImportPath: string,
): GeneratedFile | undefined => {
	const { code, entityImports, needsInvariantContext } =
		generateInvariantValidatorCode(invariant, typesImportPath);

	if (!code) {
		return undefined;
	}

	const kebabName = toKebabCase(invariant.name);
	const entityImportsString =
		entityImports.length > 0
			? `import type { ${entityImports.join(", ")} } from "${typesImportPath}";\n`
			: "";
	const contextImportString = needsInvariantContext
		? `import type { InvariantContext } from "./context";\n`
		: "";

	const content = `// Generated invariant validator for ${invariant.name}
// Do not edit - regenerate from schema

import { Effect } from "effect";

${entityImportsString}${contextImportString}import { InvariantViolation } from "./errors";

${code}`;

	return { content, filename: `invariants/${kebabName}.ts` };
};

/**
 * Generate all invariant validator files for a schema.
 */
export const generateInvariantValidators = (
	schema: DomainSchema,
	typesImportPath = "../schemas",
): readonly GeneratedFile[] => {
	const invariants = getAllInvariants(schema);

	if (invariants.length === 0) {
		return [];
	}

	const files: GeneratedFile[] = [];

	for (const entry of invariants) {
		const file = generateInvariantValidatorFile(entry.def, typesImportPath);
		if (file) {
			files.push(file);
		}
	}

	return files;
};
