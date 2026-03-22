/**
 * Entity-scoped property test generation.
 */
import type { InvariantDef } from "@morph/domain-schema";

import { toCamelCase } from "@morph/utils";

import { compileTestCondition } from "./compile-test-condition";
import { inferContextFields } from "./infer-context-fields";

/**
 * Generate a property test for an entity-scoped invariant.
 */
export const generateEntityPropertyTest = (
	invariant: InvariantDef,
	entityName: string,
): {
	arbitraryImports: readonly string[];
	code: string;
	validatorImport: string;
} => {
	const validatorName = `validate${invariant.name}`;
	const entityVariable = toCamelCase(entityName);
	const entityArbitrary = `${entityName}Arbitrary`;

	// Infer context fields
	const contextFields = inferContextFields(invariant.condition);
	const contextArbitraries = contextFields
		.filter((f) => f.referencedEntity !== undefined)
		.map((f) => `fc.array(${f.referencedEntity}Arbitrary)`);

	const contextParameters = contextFields
		.filter((f) => f.referencedEntity !== undefined)
		.map((f) => f.name);

	// Build arbitrary imports
	const arbitraryImports = [
		entityArbitrary,
		...contextFields
			.filter((f) => f.referencedEntity !== undefined)
			.map((f) => `${f.referencedEntity}Arbitrary`),
	];

	// Compile condition for direct assertion
	const compiledCondition = compileTestCondition(
		invariant.condition,
		entityVariable,
		"context",
	);

	// Build context object
	const contextObject =
		contextParameters.length > 0 ? `{ ${contextParameters.join(", ")} }` : "{}";

	const code = `
test("${invariant.name}: ${invariant.description}", () => {
	fc.assert(
		fc.property(${entityArbitrary}${contextArbitraries.length > 0 ? `, ${contextArbitraries.join(", ")}` : ""}, (${entityVariable}${contextParameters.length > 0 ? `, ${contextParameters.join(", ")}` : ""}) => {
			const context = ${contextObject};

			// Compute expected result from condition
			const conditionHolds = ${compiledCondition};

			// Run validator
			const validatorSucceeds = Effect.runSync(
				${validatorName}(${entityVariable}, context).pipe(
					Effect.map(() => true),
					Effect.catchAll(() => Effect.succeed(false)),
				),
			);

			// Property: condition and validator must agree
			return conditionHolds === validatorSucceeds;
		}),
	);
});
`;

	return { arbitraryImports, code, validatorImport: validatorName };
};
