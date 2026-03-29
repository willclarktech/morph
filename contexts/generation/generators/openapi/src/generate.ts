import type { DomainSchema, GenerationResult } from "@morphdsl/domain-schema";

import {
	getAllEntities,
	getAllErrors,
	getAllFunctions,
	getAllOperations,
	getAllValueObjects,
	getInjectableParams,
} from "@morphdsl/domain-schema";

import type { OpenApiSchema } from "./mappers";

import { getSchemaDescription, jsonToYaml } from "./format";
import { functionToOpenApi } from "./functions";
import { operationRequiresAuth, operationToOpenApi } from "./operations";
import { operationToRoute, pluralize, toKebabCase } from "./routing";
import { entityToSchema, valueObjectToSchema } from "./schemas";

interface OpenApiDocument {
	readonly components: {
		readonly schemas: Record<string, OpenApiSchema>;
		readonly securitySchemes?: Record<string, SecurityScheme>;
	};
	readonly info: {
		readonly description?: string;
		readonly title: string;
		readonly version: string;
	};
	readonly openapi: "3.0.3";
	readonly paths: Record<string, PathItem>;
	readonly security?: readonly SecurityRequirement[];
}

interface SecurityScheme {
	readonly bearerFormat?: string;
	readonly scheme?: string;
	readonly type: "apiKey" | "http" | "oauth2" | "openIdConnect";
}

type SecurityRequirement = Record<string, readonly string[]>;

interface PathItem {
	readonly delete?: PathOperation;
	readonly get?: PathOperation;
	readonly post?: PathOperation;
	readonly put?: PathOperation;
}

interface PathOperation {
	readonly description?: string;
	readonly operationId: string;
	readonly parameters?: readonly unknown[];
	readonly requestBody?: unknown;
	readonly responses: Record<string, unknown>;
	readonly security?: readonly SecurityRequirement[];
	readonly tags?: readonly string[];
}

export interface GenerateOptions {
	/** API version string (default: "1.0.0") */
	readonly apiVersion?: string;
	/** Base path prefix for all routes (default: "") */
	readonly basePath?: string;
	/** Output format: json or yaml (default: json) */
	readonly format?: "json" | "yaml";
}

const DEFAULT_OPTIONS: Required<GenerateOptions> = {
	apiVersion: "1.0.0",
	basePath: "",
	format: "json",
};

/**
 * Generate OpenAPI 3.0 specification from a DomainSchema.
 */
export const generate = (
	schema: DomainSchema,
	options?: GenerateOptions,
): GenerationResult => {
	const merged = { ...DEFAULT_OPTIONS, ...options };
	const document = generateOpenApiDocument(schema, merged);

	const content =
		merged.format === "yaml"
			? jsonToYaml(document)
			: JSON.stringify(document, undefined, "\t");

	const filename = merged.format === "yaml" ? "openapi.yaml" : "openapi.json";

	return {
		files: [{ content, filename }],
	};
};

/**
 * Generate the OpenAPI document object.
 */
const generateOpenApiDocument = (
	schema: DomainSchema,
	options: Required<GenerateOptions>,
): OpenApiDocument => {
	const entities = getAllEntities(schema);
	const valueObjects = getAllValueObjects(schema);
	const operations = getAllOperations(schema);
	const errors = getAllErrors(schema);

	// Check if any operation requires auth
	const hasAuth = operations.some((op) =>
		operationRequiresAuth(schema, op.name),
	);

	// Build component schemas
	const schemas: Record<string, OpenApiSchema> = {};

	// Add entity schemas
	for (const entity of entities) {
		schemas[entity.name] = entityToSchema(entity.name, entity.def);
	}

	// Add value object schemas
	for (const vo of valueObjects) {
		schemas[vo.name] = valueObjectToSchema(vo.def);
	}

	// Add error schemas
	for (const error of errors) {
		schemas[`${error.name}Error`] = {
			properties: {
				_tag: { enum: [`${error.name}Error`], type: "string" },
				message: { type: "string" },
			},
			required: ["_tag", "message"],
			type: "object",
		};
	}

	// Build paths
	const paths: Record<string, PathItem> = {};
	for (const op of operations) {
		// Get injectable params - they're excluded from path
		const injectableParameters = getInjectableParams(schema, op.name);
		const injectableNames = new Set(
			injectableParameters.map((p) => p.paramName),
		);

		const { method, path } = operationToRoute(
			schema,
			op.name,
			op.def,
			options.basePath,
			injectableNames,
		);
		const pathItem = paths[path] ?? {};
		const operation = operationToOpenApi(schema, op.name, op.def);
		paths[path] = { ...pathItem, [method]: operation };
	}

	// Build paths for functions with @api tag
	const apiFunctions = getAllFunctions(schema).filter((function_) =>
		function_.def.tags.includes("@api"),
	);

	for (const function_ of apiFunctions) {
		const path = `${options.basePath}/${pluralize(toKebabCase(function_.name))}`;
		const operation = functionToOpenApi(function_.name, function_.def);
		paths[path] = { post: operation };
	}

	const document: OpenApiDocument = {
		components: {
			schemas,
			...(hasAuth
				? {
						securitySchemes: {
							bearerAuth: {
								bearerFormat: "JWT",
								scheme: "bearer",
								type: "http",
							},
						},
					}
				: {}),
		},
		info: {
			description: getSchemaDescription(schema),
			title: `${schema.name} API`,
			version: options.apiVersion,
		},
		openapi: "3.0.3",
		paths,
	};

	return document;
};
