import type { DomainSchema } from "@morphdsl/domain-schema";

import {
	conditionReferencesInput,
	getAllInvariants,
} from "@morphdsl/domain-schema";
import {
	codeBlock,
	description,
	heading,
	joinSections,
} from "@morphdsl/builder-readme";

export const generatePropertiesReadme = (
	schema: DomainSchema,
	name: string,
): string => {
	const invariants = getAllInvariants(schema);
	const validatorInvariants = invariants.filter(
		(entry) =>
			entry.def.scope.kind === "entity" ||
			(entry.def.scope.kind === "context" &&
				!conditionReferencesInput(entry.def.condition)),
	);

	const dslPackage = `@${name}/dsl`;

	const quickStart = [
		heading(2, "Quick Start"),
		codeBlock(
			`import { validatorProperties } from "@${name}/properties";\nimport { ${validatorInvariants[0]?.name ? `${validatorInvariants[0].name}Arbitrary` : "EntityArbitrary"} } from "${dslPackage}";\n\n// Run property tests with your preferred runner\nfor (const prop of validatorProperties) {\n  // prop.name - the property name\n  // prop.arbitrary - fast-check arbitrary for test data\n  // prop.predicate - the invariant predicate to test\n}`,
			"typescript",
		),
	].join("\n\n");

	const propertiesList =
		validatorInvariants.length > 0
			? [
					heading(2, "Properties"),
					...validatorInvariants.map(
						(inv) => `- **${inv.name}**: ${inv.def.description}`,
					),
				].join("\n")
			: "";

	return joinSections([
		heading(1, `@${name}/properties`),
		description(schema),
		quickStart,
		propertiesList,
	]);
};
