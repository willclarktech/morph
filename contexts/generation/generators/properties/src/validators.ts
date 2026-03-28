import type { DomainSchema } from "@morph/domain-schema";

import {
	conditionReferencesCurrentUser,
	conditionReferencesInput,
	getAllEntities,
	getAllInvariants,
} from "@morph/domain-schema";
import { compileCondition } from "@morph/generator-core";
import { sortImports, toCamelCase } from "@morph/utils";

export const generateValidatorProperties = (
	schema: DomainSchema,
	dslPackage: string,
): string => {
	const invariants = getAllInvariants(schema);

	const validatorInvariants = invariants.filter(
		(entry) =>
			entry.def.scope.kind === "entity" ||
			(entry.def.scope.kind === "context" &&
				!conditionReferencesInput(entry.def.condition)),
	);

	if (validatorInvariants.length === 0) {
		return `// No validator invariants defined in schema
export const validatorProperties = [];
`;
	}

	const allEntityNames = new Set(
		getAllEntities(schema).map((e) => e.name),
	);
	const hasUserEntity = allEntityNames.has("User");

	const entityNames = new Set<string>();
	for (const entry of validatorInvariants) {
		if (entry.def.scope.kind === "entity") {
			entityNames.add(entry.def.scope.entity);
		}
	}

	const allImports = [...entityNames].map(
		(entityName) => `${entityName}Arbitrary`,
	);
	if (hasUserEntity && !entityNames.has("User")) {
		allImports.push("UserArbitrary");
	}
	const arbitraryImportsStr = allImports.join(", ");

	const propertyDefs = validatorInvariants.map((entry) => {
		const name = entry.name;
		const entryDescription = entry.def.description;

		if (entry.def.scope.kind === "entity") {
			const entityName = entry.def.scope.entity;
			const entityVariable = toCamelCase(entityName);
			const predicateExpr = compileCondition(
				entry.def.condition,
				entityVariable,
				"context",
			);
			const refsCurrentUser = conditionReferencesCurrentUser(
				entry.def.condition,
			);
			let contextArbitrary: string;
			if (!hasUserEntity) {
				contextArbitrary = "fc.record({})";
			} else if (refsCurrentUser) {
				contextArbitrary =
					"fc.record({ currentUser: UserArbitrary, users: fc.array(UserArbitrary) })";
			} else {
				contextArbitrary =
					"fc.record({ users: fc.array(UserArbitrary) })";
			}
			return `export const ${toCamelCase(name)} = validatorProperty({
	name: "${name}",
	description: "${entryDescription}",
	arbitrary: ${entityName}Arbitrary,
	contextArbitrary: ${contextArbitrary},
	validatorName: "validate${name}",
	predicate: (${entityVariable}, ${predicateExpr.includes("context") ? "context" : "_context"}) => ${predicateExpr},
});`;
		} else {
			const predicateExpr = compileCondition(
				entry.def.condition,
				"_unused",
				"context",
			);
			return `export const ${toCamelCase(name)} = validatorProperty({
	name: "${name}",
	description: "${entryDescription}",
	arbitrary: ${hasUserEntity ? "UserArbitrary" : "fc.record({})"},
	validatorName: "validate${name}",
	predicate: (currentUser) => {
		const context = { currentUser };
		return ${predicateExpr};
	},
});`;
		}
	});

	const propertyNames = validatorInvariants
		.map((entry) => toCamelCase(entry.name))
		.join(", ");

	const imports = sortImports(
		[
			`import type { AnyPropertySuite } from "@morph/property";`,
			`import { validatorProperty } from "@morph/property";`,
			`import * as fc from "fast-check";`,
			`import { ${arbitraryImportsStr} } from "${dslPackage}";`,
		].join("\n"),
	);

	return `// Generated validator property suites from invariants
// Do not edit - regenerate from schema
${imports}

${propertyDefs.join("\n\n")}

// Type cast needed due to function parameter contravariance
export const validatorProperties = [${propertyNames}] as unknown as AnyPropertySuite[];
`;
};
