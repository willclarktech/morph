export const generateScenariosScaffold = (
	dslPackage: string,
): string => {
	const imports = [
		`import * as ops from "${dslPackage}";`,
		`import { assert, given, scenario, then, when } from "@morph/scenario";`,
	]
		.sort()
		.join("\n");
	return `/* eslint-disable @typescript-eslint/no-unused-vars -- Scaffold imports for convenience */
${imports}
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * Hand-write your test scenarios here.
 * These scenarios work with any runner (core lib, CLI, etc.)
 */
export const scenarios = [
	// Example:
	// scenario("Create a new user",
	//   given([]),
	//   when(ops.createUser({ name: "Alice" })),
	//   then(assert.succeeds())
	// ),
];
`;
};
