/**
 * API README generation.
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
	getAllFunctions,
	getAllOperations,
	getAllValueObjects,
} from "@morphdsl/domain-schema";

/**
 * Infer HTTP method from operation name.
 */
const inferHttpMethod = (name: string): string => {
	if (name.startsWith("get") || name.startsWith("list")) return "GET";
	if (name.startsWith("create")) return "POST";
	if (name.startsWith("update")) return "PUT";
	if (name.startsWith("delete")) return "DELETE";
	return "POST";
};

/**
 * Build API path from operation name.
 */
const buildApiPath = (name: string, basePath: string): string => {
	// Simple kebab-case conversion
	const kebab = name.replaceAll(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
	return `${basePath}/${kebab}`;
};

/**
 * Generate a curl example for an API endpoint.
 */
const generateApiExample = (
	op: QualifiedEntry<OperationDef>,
	basePath: string,
): string => {
	const method = inferHttpMethod(op.name);
	const path = buildApiPath(op.name, basePath);

	const requiredParameters = Object.entries(op.def.input)
		.filter(([, p]) => !p.optional && !p.sensitive)
		.map(([name]) => `"${name}": "<value>"`)
		.join(", ");

	if (method === "GET") {
		return `curl ${path}`;
	}

	return `curl -X ${method} ${path} \\\n  -H "Content-Type: application/json" \\\n  -d '{${requiredParameters}}'`;
};

/**
 * Generate README for API package.
 */
export const generateApiReadme = (
	schema: DomainSchema,
	apiName: string,
	apiDescription?: string,
): string => {
	// Get operations (commands/queries) with @api tag
	const apiOps = getAllOperations(schema).filter((op) =>
		op.def.tags.includes("@api"),
	);

	// Get functions with @api tag - cast to OperationDef for readme compatibility
	const apiFuncs = getAllFunctions(schema)
		.filter((function_) => function_.def.tags.includes("@api"))
		.map((function_) => ({
			...function_,
			def: function_.def as unknown as OperationDef,
		}));

	// Combine operations and functions
	const allApiOps = [...apiOps, ...apiFuncs];

	const quickStart = [
		heading(2, "Quick Start"),
		codeBlock(`# Start the server\nbun run dev\n\n# Or\nbun run start`, "bash"),
		`Server runs at http://localhost:3000\n\nAPI docs at http://localhost:3000/api/docs`,
	].join("\n\n");

	return joinSections([
		heading(1, `@${apiName}/api`),
		apiDescription ?? description(schema),
		quickStart,
		operations(allApiOps, {
			exampleGenerator: (op: QualifiedEntry<OperationDef>) =>
				generateApiExample(op, "/api"),
			exampleLang: "bash",
			schema,
		}),
		entities(getAllEntities(schema)),
		valueObjects(getAllValueObjects(schema)),
		events(schema),
		errors(schema),
	]);
};
