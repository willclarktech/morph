// Handler implementation for validate function
// Validates a domain schema structure

import type { GenerationResult } from "@code-generator/generation-dsl";

import { Effect, Layer } from "effect";

import { ValidateHandler } from "./handler";

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

export const ValidateHandlerLive = Layer.succeed(ValidateHandler, {
	handle: (params, _options) =>
		Effect.gen(function* () {
			const warnings: string[] = [];
			const info: string[] = [];

			// Parse the input schema string as JSON
			let parsed: unknown;
			try {
				parsed = JSON.parse(params.schema);
			} catch (error) {
				const result: GenerationResult = {
					status: "failure",
					errors: [
						`Invalid JSON: ${error instanceof Error ? error.message : "parse error"}`,
					],
				};
				return result;
			}

			// Validate it's an object
			if (typeof parsed !== "object" || parsed === null) {
				const result: GenerationResult = {
					status: "failure",
					errors: ["Schema must be an object"],
				};
				return result;
			}

			const schema = parsed as DomainSchema;

			// Check for name
			if (!schema.name || typeof schema.name !== "string") {
				const result: GenerationResult = {
					status: "failure",
					errors: ["Schema must have a 'name' property of type string"],
				};
				return result;
			}
			info.push(`Schema name: ${schema.name}`);

			// Check for contexts
			if (!schema.contexts || typeof schema.contexts !== "object") {
				warnings.push("Schema has no 'contexts' - nothing to generate");
			} else {
				const contextNames = Object.keys(schema.contexts);
				info.push(`Contexts: ${contextNames.join(", ") || "(none)"}`);

				for (const [ctxName, ctx] of Object.entries(schema.contexts)) {
					const counts: string[] = [];
					if (ctx.entities)
						counts.push(`${Object.keys(ctx.entities).length} entities`);
					if (ctx.types) counts.push(`${Object.keys(ctx.types).length} types`);
					if (ctx.functions)
						counts.push(`${Object.keys(ctx.functions).length} functions`);
					if (ctx.commands)
						counts.push(`${Object.keys(ctx.commands).length} commands`);
					if (ctx.queries)
						counts.push(`${Object.keys(ctx.queries).length} queries`);

					if (counts.length > 0) {
						info.push(`  ${ctxName}: ${counts.join(", ")}`);
					} else {
						warnings.push(`Context '${ctxName}' has no definitions`);
					}
				}
			}

			// Log validation info
			for (const line of info) {
				yield* Effect.logInfo(line);
			}

			const result: GenerationResult = {
				status: "success",
				files: [],
				warnings,
			};

			return result;
		}),
});
