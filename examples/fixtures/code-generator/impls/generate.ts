// Handler implementation for generate function
// Generates TypeScript types from a domain schema

import type { GeneratedFile, GenerationResult } from "@code-generator/generation-dsl";

import { InvalidSchemaError } from "@code-generator/generation-dsl";

import { Effect, Layer } from "effect";

import { GenerateHandler } from "./handler";

interface DomainSchema {
	readonly name: string;
	readonly contexts?: Record<string, ContextDef>;
}

interface ContextDef {
	readonly description?: string;
	readonly types?: Record<string, TypeDef>;
	readonly functions?: Record<string, FunctionDef>;
}

interface TypeDef {
	readonly kind: "product" | "sum" | "alias";
	readonly description?: string;
	readonly fields?: Record<string, FieldDef>;
	readonly discriminator?: string;
	readonly variants?: Record<string, VariantDef>;
	readonly type?: TypeRef;
}

interface FieldDef {
	readonly description?: string;
	readonly type: TypeRef;
}

interface VariantDef {
	readonly description?: string;
	readonly fields?: Record<string, FieldDef>;
}

interface TypeRef {
	readonly kind: string;
	readonly name?: string;
	readonly element?: TypeRef;
}

interface FunctionDef {
	readonly description?: string;
	readonly input?: Record<string, ParamDef>;
	readonly output?: TypeRef;
}

interface ParamDef {
	readonly description?: string;
	readonly type: TypeRef;
	readonly optional?: boolean;
}

const typeRefToTS = (ref: TypeRef): string => {
	switch (ref.kind) {
		case "array": {
			return ref.element
				? `readonly ${typeRefToTS(ref.element)}[]`
				: "readonly unknown[]";
		}
		case "primitive": {
			const name = ref.name ?? "unknown";
			const map: Record<string, string> = {
				datetime: "Date",
				float: "number",
				integer: "bigint",
			};
			return map[name] ?? name;
		}
		case "type": {
			return ref.name ?? "unknown";
		}
		default: {
			return "unknown";
		}
	}
};

const generateProductType = (name: string, def: TypeDef): string => {
	const lines = [
		`/** ${def.description ?? name} */`,
		`export interface ${name} {`,
	];
	if (def.fields) {
		for (const [fieldName, field] of Object.entries(def.fields)) {
			lines.push(`\treadonly ${fieldName}: ${typeRefToTS(field.type)};`);
		}
	}
	lines.push("}");
	return lines.join("\n");
};

const generateSumType = (name: string, def: TypeDef): string => {
	const discriminator = def.discriminator ?? "kind";
	const variants: string[] = [];

	if (def.variants) {
		for (const [variantName, variant] of Object.entries(def.variants)) {
			const fields = [`readonly ${discriminator}: "${variantName}"`];
			if (variant.fields) {
				for (const [fieldName, field] of Object.entries(variant.fields)) {
					fields.push(`readonly ${fieldName}: ${typeRefToTS(field.type)}`);
				}
			}
			variants.push(`{ ${fields.join("; ")} }`);
		}
	}

	return [
		`/** ${def.description ?? name} */`,
		`export type ${name} = ${variants.join(" | ") || "never"};`,
	].join("\n");
};

const generateAliasType = (name: string, def: TypeDef): string => {
	const type = def.type ? typeRefToTS(def.type) : "unknown";
	return [
		`/** ${def.description ?? name} */`,
		`export type ${name} = ${type};`,
	].join("\n");
};

const generateFunctionType = (name: string, def: FunctionDef): string => {
	const params: string[] = [];
	if (def.input) {
		for (const [paramName, param] of Object.entries(def.input)) {
			const opt = param.optional ? "?" : "";
			params.push(`${paramName}${opt}: ${typeRefToTS(param.type)}`);
		}
	}
	const returnType = def.output ? typeRefToTS(def.output) : "void";

	return [
		`/** ${def.description ?? name} */`,
		`export type ${name}Fn = (params: { ${params.join("; ")} }) => ${returnType};`,
	].join("\n");
};

export const GenerateHandlerLive = Layer.succeed(GenerateHandler, {
	handle: (params, _options) =>
		Effect.gen(function* () {
			// Parse the input schema string as JSON
			let parsed: unknown;
			try {
				parsed = JSON.parse(params.schema);
			} catch {
				return yield* Effect.fail(
					new InvalidSchemaError({
						message: "Invalid JSON: could not parse schema input",
					}),
				);
			}

			// Validate minimal schema structure
			if (
				typeof parsed !== "object" ||
				parsed === null ||
				!("name" in parsed) ||
				typeof (parsed as { name: unknown }).name !== "string"
			) {
				return yield* Effect.fail(
					new InvalidSchemaError({
						message: "Schema must have a 'name' property of type string",
					}),
				);
			}

			const schema = parsed as DomainSchema;
			const files: GeneratedFile[] = [];
			const warnings: string[] = [];

			// Generate types for each context
			if (schema.contexts) {
				for (const [contextName, context] of Object.entries(schema.contexts)) {
					const sections: string[] = [
						`// Generated types for context: ${contextName}`,
						`// ${context.description ?? ""}`,
						"",
					];

					// Generate types
					if (context.types) {
						for (const [typeName, typeDef] of Object.entries(context.types)) {
							switch (typeDef.kind) {
								case "alias": {
									sections.push(generateAliasType(typeName, typeDef));
									break;
								}
								case "product": {
									sections.push(generateProductType(typeName, typeDef));
									break;
								}
								case "sum": {
									sections.push(generateSumType(typeName, typeDef));
									break;
								}
								default: {
									warnings.push(`Unknown type kind for ${typeName}`);
								}
							}
							sections.push("");
						}
					}

					// Generate function types
					if (context.functions) {
						for (const [functionName, functionDef] of Object.entries(context.functions)) {
							sections.push(generateFunctionType(functionName, functionDef));
							sections.push("");
						}
					}

					if (sections.length > 3) {
						// More than just the header
						files.push({
							path: `${contextName}.ts`,
							content: sections.join("\n"),
						});
					}
				}
			}

			if (files.length === 0) {
				warnings.push("No types or functions found to generate");
				files.push({
					path: "empty.ts",
					content: `// No types or functions defined in schema: ${schema.name}\nexport {};\n`,
				});
			}

			const result: GenerationResult = {
				status: "success",
				files,
				warnings,
			};

			return result;
		}),
});
