/**
 * Context-scoped property test generation.
 */
import type { InvariantDef } from "@morphdsl/domain-schema";

import { compileTestCondition } from "./compile-test-condition";
import { conditionReferencesCurrentUser } from "./invariants";

/**
 * Generate a property test for a context-scoped invariant.
 */
export const generateContextPropertyTest = (
	invariant: InvariantDef,
): {
	arbitraryImports: readonly string[];
	code: string;
	validatorImport: string;
} => {
	const validatorName = `validate${invariant.name}`;

	// If the condition references context.currentUser, we need an arbitrary user
	const needsUser = conditionReferencesCurrentUser(invariant.condition);

	const compiledCondition = compileTestCondition(
		invariant.condition,
		"_entity",
		"context",
	);

	const code = needsUser
		? `
test("${invariant.name}: ${invariant.description}", () => {
	fc.assert(
		fc.property(fc.option(UserArbitrary, { nil: undefined }), (currentUser) => {
			const context: InvariantContext = {
				currentUser,
				operationName: "test",
				timestamp: new Date().toISOString(),
				entities: {},
			};

			// Compute expected result from condition
			const conditionHolds = ${compiledCondition};

			// Run validator
			const validatorSucceeds = Effect.runSync(
				${validatorName}(context).pipe(
					Effect.map(() => true),
					Effect.catchAll(() => Effect.succeed(false)),
				),
			);

			// Property: condition and validator must agree
			return conditionHolds === validatorSucceeds;
		}),
	);
});
`
		: `
test("${invariant.name}: ${invariant.description}", () => {
	fc.assert(
		fc.property(fc.constant(undefined), () => {
			const context: InvariantContext = {
				currentUser: undefined,
				operationName: "test",
				timestamp: new Date().toISOString(),
				entities: {},
			};

			// Compute expected result from condition
			const conditionHolds = ${compiledCondition};

			// Run validator
			const validatorSucceeds = Effect.runSync(
				${validatorName}(context).pipe(
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

	return {
		arbitraryImports: needsUser ? ["UserArbitrary"] : [],
		code,
		validatorImport: validatorName,
	};
};
