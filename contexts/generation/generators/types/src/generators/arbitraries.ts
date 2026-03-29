import type { DomainSchema } from "@morphdsl/domain-schema";

import {
	getAllEntities,
	getAllValueObjects,
	getEntitiesForContext,
	getValueObjectsForContext,
} from "@morphdsl/domain-schema";

/**
 * Generate fast-check Arbitraries from Effect Schemas.
 * Used for property-based testing of invariants.
 *
 * Output is a separate file to keep schemas.ts dependency-free
 * (no fast-check import in production code).
 */
export const generateArbitraries = (
	schema: DomainSchema,
	options: {
		readonly contextName?: string;
		readonly schemasImportPath?: string;
	} = {},
): string => {
	const schemasPath = options.schemasImportPath ?? "./schemas";
	const entities = (
		options.contextName
			? getEntitiesForContext(schema, options.contextName)
			: getAllEntities(schema)
	).map((entry) => entry.name);
	const valueObjects = (
		options.contextName
			? getValueObjectsForContext(schema, options.contextName)
			: getAllValueObjects(schema)
	).map((entry) => entry.name);

	if (entities.length === 0 && valueObjects.length === 0) {
		return "";
	}

	const schemaImports = [
		...entities.map((name) => `${name}Schema`),
		...entities.map((name) => `${name}IdSchema`),
		...valueObjects.map((name) => `${name}Schema`),
	].sort();

	const header = [
		"// Generated Arbitraries for property-based testing",
		"// Do not edit - regenerate from schema",
		"",
		'import * as Arbitrary from "effect/Arbitrary";',
		"",
		`import { ${schemaImports.join(", ")} } from "${schemasPath}";`,
		"",
	].join("\n");

	// Generate entity arbitraries (including ID arbitraries)
	const entityArbitraries = entities.flatMap((name) => [
		`export const ${name}IdArbitrary = Arbitrary.make(${name}IdSchema);`,
		`export const ${name}Arbitrary = Arbitrary.make(${name}Schema);`,
	]);

	// Generate value object arbitraries
	const valueObjectArbitraries = valueObjects.map(
		(name) => `export const ${name}Arbitrary = Arbitrary.make(${name}Schema);`,
	);

	const sections = [
		header,
		...(entityArbitraries.length > 0
			? ["// Entity Arbitraries", ...entityArbitraries, ""]
			: []),
		...(valueObjectArbitraries.length > 0
			? ["// Value Object Arbitraries", ...valueObjectArbitraries, ""]
			: []),
	];

	return sections.join("\n");
};
