// Implementation of validate function
// Validates a domain schema structure

import type { GenerationResult } from "@code-generator/generation-dsl";

interface DomainSchema {
	readonly name?: string;
	readonly contexts?: Record<string, ContextDef>;
}

interface ContextDef {
	readonly description?: string;
	readonly entities?: Record<string, unknown>;
	readonly types?: Record<string, unknown>;
	readonly functions?: Record<string, unknown>;
	readonly commands?: Record<string, unknown>;
	readonly queries?: Record<string, unknown>;
}

export const validate = (
	params: { readonly schema: string },
	_options: Record<string, never>,
): GenerationResult => {
	const warnings: string[] = [];

	let parsed: unknown;
	try {
		parsed = JSON.parse(params.schema);
	} catch (error) {
		return {
			status: "failure",
			errors: [
				`Invalid JSON: ${error instanceof Error ? error.message : "parse error"}`,
			],
		};
	}

	if (typeof parsed !== "object" || parsed === null) {
		return {
			status: "failure",
			errors: ["Schema must be an object"],
		};
	}

	const schema = parsed as DomainSchema;

	if (!schema.name || typeof schema.name !== "string") {
		return {
			status: "failure",
			errors: ["Schema must have a 'name' property of type string"],
		};
	}

	if (!schema.contexts || typeof schema.contexts !== "object") {
		warnings.push("Schema has no 'contexts' - nothing to generate");
	} else {
		for (const [contextName, context] of Object.entries(schema.contexts)) {
			const counts: string[] = [];
			if (context.entities)
				counts.push(`${String(Object.keys(context.entities).length)} entities`);
			if (context.types)
				counts.push(`${String(Object.keys(context.types).length)} types`);
			if (context.functions)
				counts.push(
					`${String(Object.keys(context.functions).length)} functions`,
				);
			if (context.commands)
				counts.push(`${String(Object.keys(context.commands).length)} commands`);
			if (context.queries)
				counts.push(`${String(Object.keys(context.queries).length)} queries`);

			if (counts.length === 0) {
				warnings.push(`Context '${contextName}' has no definitions`);
			}
		}
	}

	return {
		status: "success",
		files: [],
		warnings,
	};
};
