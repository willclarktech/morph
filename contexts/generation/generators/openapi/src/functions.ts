import type { FunctionDef } from "@morph/domain-schema";

import type { OpenApiSchema } from "./mappers";
import type { Operation } from "./operations";

import { typeRefToOpenApiSchema } from "./mappers";
import { errorToStatusCode } from "./operations";

interface Response {
	readonly content?: {
		readonly "application/json": {
			readonly schema: OpenApiSchema;
		};
	};
	readonly description: string;
}

/**
 * Convert a function definition to OpenAPI operation object.
 * Functions are always POST endpoints with request body and JSON response.
 */
export const functionToOpenApi = (
	name: string,
	def: FunctionDef,
): Operation => {
	const bodyProperties: Record<string, OpenApiSchema> = {};
	const bodyRequired: string[] = [];

	for (const [paramName, paramDef] of Object.entries(def.input)) {
		bodyProperties[paramName] = typeRefToOpenApiSchema(paramDef.type);
		if (!paramDef.optional) {
			bodyRequired.push(paramName);
		}
	}

	const responses: Record<string, Response> = {
		"200": {
			content: {
				"application/json": {
					schema: typeRefToOpenApiSchema(def.output),
				},
			},
			description: "Successful operation",
		},
	};

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

	return {
		description: def.description,
		operationId: name,
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
		tags: ["Functions"],
	};
};
