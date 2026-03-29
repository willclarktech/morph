import type { DomainSchema, OperationDef } from "@morphdsl/domain-schema";

import {
	conditionReferencesCurrentUser,
	getInjectableParams,
	getOperationPreInvariantDefs,
	getPrimaryWriteAggregate,
	isDomainService,
} from "@morphdsl/domain-schema";

import type { OpenApiSchema } from "./mappers";

import { typeRefToOpenApiSchema } from "./mappers";
import { parseOperationName } from "./routing";

export interface Operation {
	readonly description?: string;
	readonly operationId: string;
	readonly parameters?: readonly Parameter[];
	readonly requestBody?: RequestBody;
	readonly responses: Record<string, Response>;
	readonly security?: readonly SecurityRequirement[];
	readonly tags?: readonly string[];
}

interface Parameter {
	readonly description?: string;
	readonly in: "path" | "query";
	readonly name: string;
	readonly required: boolean;
	readonly schema: OpenApiSchema;
}

interface RequestBody {
	readonly content: {
		readonly "application/json": {
			readonly schema: OpenApiSchema;
		};
	};
	readonly required: boolean;
}

interface Response {
	readonly content?: {
		readonly "application/json": {
			readonly schema: OpenApiSchema;
		};
	};
	readonly description: string;
}

type SecurityRequirement = Record<string, readonly string[]>;

/**
 * Convert an operation to OpenAPI operation object.
 */
export const operationToOpenApi = (
	schema: DomainSchema,
	name: string,
	def: OperationDef,
): Operation => {
	const requiresAuth = operationRequiresAuth(schema, name);
	const domainService = isDomainService(schema, name);

	// Determine tags based on whether this is a domain service
	let tags: string[];
	if (domainService) {
		const primaryAggregate = getPrimaryWriteAggregate(schema, name);
		tags = primaryAggregate
			? [primaryAggregate, "Domain Services"]
			: ["Domain Services"];
	} else {
		const { resource } = parseOperationName(name);
		tags = [resource];
	}

	const { action } = parseOperationName(name);

	// Get injectable params - these can be auto-filled from auth context
	const injectableParameters = getInjectableParams(schema, name);
	const injectableNames = new Set(injectableParameters.map((p) => p.paramName));

	// Build parameters and request body
	const parameters: Parameter[] = [];
	const bodyProperties: Record<string, OpenApiSchema> = {};
	const bodyRequired: string[] = [];

	for (const [paramName, paramDef] of Object.entries(def.input)) {
		// Skip injectable params entirely - they're injected from auth context
		if (injectableNames.has(paramName)) {
			continue;
		}

		// Path parameters (entity IDs for get/update/delete)
		if (
			paramDef.type.kind === "entityId" &&
			["complete", "delete", "get", "update"].includes(action)
		) {
			parameters.push({
				description: paramDef.description,
				in: "path",
				name: paramName,
				required: true,
				schema: { type: "string" },
			});
		} else if (action === "list" && paramDef.optional) {
			// Query parameters for list operations
			parameters.push({
				description: paramDef.description,
				in: "query",
				name: paramName,
				required: false,
				schema: typeRefToOpenApiSchema(paramDef.type),
			});
		} else if (action === "list" && paramDef.type.kind === "entityId") {
			// Required filter params as query params for list
			parameters.push({
				description: paramDef.description,
				in: "query",
				name: paramName,
				required: !paramDef.optional,
				schema: typeRefToOpenApiSchema(paramDef.type),
			});
		} else {
			// Request body properties
			bodyProperties[paramName] = typeRefToOpenApiSchema(paramDef.type);
			if (!paramDef.optional) {
				bodyRequired.push(paramName);
			}
		}
	}

	// Build responses
	const responses: Record<string, Response> = {};

	// Success response
	responses["200"] = {
		content: {
			"application/json": {
				schema: typeRefToOpenApiSchema(def.output),
			},
		},
		description: "Successful operation",
	};

	// Error responses
	for (const error of def.errors) {
		const statusCode = errorToStatusCode(error.name);
		responses[statusCode] = {
			content: {
				"application/json": {
					schema: { $ref: `#/components/schemas/${error.name}Error` },
				},
			},
			description: error.description,
		};
	}

	// Auth error if required
	if (requiresAuth) {
		responses["401"] = {
			description: "Authentication required",
		};
		responses["403"] = {
			description: "Access denied",
		};
	}

	const operation: Operation = {
		description: def.description,
		operationId: name,
		...(parameters.length > 0 ? { parameters } : {}),
		...(Object.keys(bodyProperties).length > 0
			? {
					requestBody: {
						content: {
							"application/json": {
								schema: {
									properties: bodyProperties,
									required: bodyRequired,
									type: "object",
								},
							},
						},
						required: true,
					},
				}
			: {}),
		responses,
		...(requiresAuth ? { security: [{ bearerAuth: [] }] } : {}),
		tags,
	};

	return operation;
};

/**
 * Check if an operation requires authentication.
 */
export const operationRequiresAuth = (
	schema: DomainSchema,
	operationName: string,
): boolean => {
	const preInvariants = getOperationPreInvariantDefs(schema, operationName);
	return preInvariants.some((inv) =>
		conditionReferencesCurrentUser(inv.condition),
	);
};

/**
 * Map error name to HTTP status code.
 */
export const errorToStatusCode = (errorName: string): string => {
	const name = errorName.toLowerCase();
	if (name.includes("notfound")) return "404";
	if (name.includes("unauthorized") || name.includes("auth")) return "401";
	if (name.includes("forbidden") || name.includes("denied")) return "403";
	if (name.includes("conflict") || name.includes("exists")) return "409";
	if (name.includes("invalid") || name.includes("validation")) return "400";
	return "400"; // Default to bad request
};
