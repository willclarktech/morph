/**
 * README generation for DSL package.
 */
import type {
	DomainSchema,
	OperationDef,
	QualifiedEntry,
} from "@morphdsl/domain-schema";

import {
	codeBlock,
	description,
	entities,
	errors,
	events,
	heading,
	joinSections,
	operations,
	valueObjects,
} from "@morphdsl/builder-readme";
import {
	getAllEntities,
	getAllOperations,
	getAllValueObjects,
} from "@morphdsl/domain-schema";

/**
 * Generate a DSL usage example.
 */
const generateDslExample = (op: QualifiedEntry<OperationDef>): string => {
	const params = Object.entries(op.def.input)
		.filter(([, p]) => !p.optional && !p.sensitive)
		.map(([name]) => `${name}: "<value>"`)
		.join(", ");

	return `import { ${op.name} } from "@scope/dsl";\n\nconst step = ${op.name}({ ${params} });`;
};

/**
 * Generate README for DSL package.
 */
export const generateDslReadme = (
	schema: DomainSchema,
	scope: string,
): string => {
	const allOps = getAllOperations(schema);

	const quickStart = [
		heading(2, "Quick Start"),
		codeBlock(
			`import { ${allOps[0]?.name ?? "operationName"} } from "@${scope}/dsl";\n\n// Use in test scenarios\nconst scenario = [\n  ${allOps[0]?.name ?? "operationName"}({ /* params */ }),\n];`,
			"typescript",
		),
	].join("\n\n");

	return joinSections([
		heading(1, `@${scope}/dsl`),
		description(schema),
		quickStart,
		heading(2, "Operations"),
		operations(allOps, {
			exampleGenerator: (op: QualifiedEntry<OperationDef>) =>
				generateDslExample(op),
			exampleLang: "typescript",
			headingLevel: 3,
			schema,
		}),
		entities(getAllEntities(schema)),
		valueObjects(getAllValueObjects(schema)),
		events(schema),
		errors(schema),
	]);
};
