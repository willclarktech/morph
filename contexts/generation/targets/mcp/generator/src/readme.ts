/**
 * MCP README generation.
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
	getInjectableParams,
} from "@morphdsl/domain-schema";

/**
 * Generate an MCP tool usage example.
 * Excludes injectable params since they're auto-filled from auth context.
 */
const generateMcpExample = (
	op: QualifiedEntry<OperationDef>,
	injectableNames: ReadonlySet<string>,
): string => {
	const params = Object.entries(op.def.input)
		.filter(
			([name, p]) => !p.optional && !p.sensitive && !injectableNames.has(name),
		)
		.map(([name]) => `"${name}": "<value>"`)
		.join(", ");

	return `// Tool: ${op.name}\n{ ${params} }`;
};

/**
 * Generate README for MCP package.
 */
export const generateMcpReadme = (
	schema: DomainSchema,
	mcpName: string,
	mcpDescription?: string,
): string => {
	// Get operations (commands/queries) with @mcp tag
	const mcpOps = getAllOperations(schema).filter((op) =>
		op.def.tags.includes("@mcp"),
	);

	// Get functions with @mcp tag - cast to OperationDef for readme compatibility
	const mcpFuncs = getAllFunctions(schema)
		.filter((function_) => function_.def.tags.includes("@mcp"))
		.map((function_) => ({
			...function_,
			def: function_.def as unknown as OperationDef,
		}));

	// Combine operations and functions
	const allMcpOps = [...mcpOps, ...mcpFuncs];

	// Build injectable params map for examples
	const injectableByOp: Record<string, ReadonlySet<string>> = {};
	for (const op of mcpOps) {
		const params = getInjectableParams(schema, op.name);
		if (params.length > 0) {
			injectableByOp[op.name] = new Set(params.map((p) => p.paramName));
		}
	}

	const quickStart = [
		heading(2, "Quick Start"),
		codeBlock(
			`# Run the MCP server\nbun run start\n\n# Or inspect with MCP Inspector\nbun run inspect`,
			"bash",
		),
	].join("\n\n");

	return joinSections([
		heading(1, `@${mcpName}/mcp`),
		mcpDescription ?? description(schema),
		quickStart,
		heading(2, "Tools"),
		operations(allMcpOps, {
			exampleGenerator: (op: QualifiedEntry<OperationDef>) =>
				generateMcpExample(op, injectableByOp[op.name] ?? new Set()),
			exampleLang: "json",
			headingLevel: 3,
			schema,
		}),
		entities(getAllEntities(schema)),
		valueObjects(getAllValueObjects(schema)),
		events(schema),
		errors(schema),
	]);
};
