import type {
	DomainSchema,
	OperationDef,
	QualifiedEntry,
} from "@morphdsl/domain-schema";
import {
	getAllEntities,
	getAllOperations,
	getAllValueObjects,
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

const generateClientExample = (op: QualifiedEntry<OperationDef>): string => {
	const params = Object.entries(op.def.input)
		.filter(([, p]) => !p.optional && !p.sensitive)
		.map(([paramName]) => `${paramName}: "<value>"`)
		.join(", ");

	return `const result = await Effect.runPromise(\n  client.${op.name}({ ${params} })\n);`;
};

export const generateClientReadme = (schema: DomainSchema, name: string): string => {
	const apiOps = getAllOperations(schema).filter((op) =>
		op.def.tags.includes("@api"),
	);

	const quickStart = [
		heading(2, "Quick Start"),
		codeBlock(
			`import { createClient } from "@${name}/client";\nimport { Effect } from "effect";\n\nconst client = createClient({ baseUrl: "http://localhost:3000/api" });\n\n// Example: ${apiOps[0]?.name ?? "operationName"}\nconst result = await Effect.runPromise(\n  client.${apiOps[0]?.name ?? "operationName"}({ /* params */ })\n);`,
			"typescript",
		),
	].join("\n\n");

	return joinSections([
		heading(1, `@${name}/client`),
		description(schema),
		quickStart,
		heading(2, "Methods"),
		operations(apiOps, {
			exampleGenerator: (op: QualifiedEntry<OperationDef>) =>
				generateClientExample(op),
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
