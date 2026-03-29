import type { ParamDef } from "@morphdsl/domain-schema";

import { typeRefToSchema } from "./type-to-schema";

/**
 * Convert a ParamDef to its Effect/Schema string representation.
 * Handles optional wrapping and description/sensitive annotations.
 */
export const parameterDefToSchema = (parameter: ParamDef): string => {
	const baseSchema = typeRefToSchema(parameter.type);

	// Wrap in S.optional if param is optional
	const schema =
		parameter.optional === true ? `S.optional(${baseSchema})` : baseSchema;

	// Build annotations object
	const annotations: string[] = [];
	if (parameter.description) {
		annotations.push(`description: "${escapeString(parameter.description)}"`);
	}
	if (parameter.sensitive === true) {
		annotations.push("sensitive: true");
	}

	// Add annotations if any
	return annotations.length > 0
		? `${schema}.annotations({ ${annotations.join(", ")} })`
		: schema;
};

/**
 * Escape special characters in strings for code generation.
 */
const escapeString = (s: string): string =>
	s
		.replaceAll("\\", "\\\\")
		.replaceAll('"', String.raw`\"`)
		.replaceAll("\n", String.raw`\n`);
