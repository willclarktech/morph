import type { DomainSchema } from "@morphdsl/domain-schema";

import { getAllOperations } from "@morphdsl/domain-schema";
import {
	codeBlock,
	description,
	heading,
	joinSections,
} from "@morphdsl/builder-readme";

export const generateScenariosReadme = (
	schema: DomainSchema,
	name: string,
	dslPackage?: string,
): string => {
	const allOps = getAllOperations(schema);
	const resolvedDslPackage = dslPackage ?? `@${name.toLowerCase()}/dsl`;

	const opImports = allOps.map((op) => op.name).join(", ");
	const exampleOp = allOps[0]?.name ?? "createUser";

	const quickStart = [
		heading(2, "Quick Start"),
		codeBlock(
			`import { assert, given, scenario, then, when } from "@morphdsl/scenario";\nimport { ${opImports} } from "${resolvedDslPackage}";\n\nexport const scenarios = [\n  scenario("Example scenario",\n    given([]),\n    when(${exampleOp}({ /* params */ })),\n    then(assert.succeeds())\n  ),\n];`,
			"typescript",
		),
	].join("\n\n");

	const assertions = [
		heading(2, "Assertions"),
		"- `assert.succeeds()` - Operation should complete successfully",
		"- `assert.fails(ErrorType)` - Operation should fail with specific error",
		"- `assert.returns(value)` - Operation should return specific value",
		"- `assert.matches(predicate)` - Result should match predicate",
	].join("\n");

	return joinSections([
		heading(1, `@${name}/scenarios`),
		description(schema),
		quickStart,
		assertions,
	]);
};
