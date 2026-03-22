import type { DomainSchema } from "@morph/domain-schema";

/**
 * Get schema description from first context.
 */
export const getSchemaDescription = (schema: DomainSchema): string => {
	const contexts = Object.values(schema.contexts);
	return contexts[0]?.description ?? `${schema.name} domain API`;
};

/**
 * Simple JSON to YAML converter (basic, no external deps).
 */
export const jsonToYaml = (object: unknown, indent = 0): string => {
	const spaces = "  ".repeat(indent);

	if (object === null || object === undefined) {
		return "null";
	}

	if (typeof object === "boolean" || typeof object === "number") {
		return String(object);
	}

	if (typeof object === "string") {
		// Quote strings that need it
		if (
			object.includes(":") ||
			object.includes("#") ||
			object.includes("\n") ||
			object.startsWith(" ") ||
			object.endsWith(" ")
		) {
			return `"${object.replaceAll('"', String.raw`\"`)}"`;
		}
		return object;
	}

	if (Array.isArray(object)) {
		if (object.length === 0) return "[]";
		return object
			.map((item) => `${spaces}- ${jsonToYaml(item, indent + 1).trimStart()}`)
			.join("\n");
	}

	if (typeof object === "object") {
		const entries = Object.entries(object);
		if (entries.length === 0) return "{}";

		return entries
			.map(([key, value]) => {
				const yamlValue = jsonToYaml(value, indent + 1);
				if (
					typeof value === "object" &&
					value !== null &&
					!Array.isArray(value)
				) {
					return `${spaces}${key}:\n${yamlValue}`;
				}
				if (Array.isArray(value) && value.length > 0) {
					return `${spaces}${key}:\n${yamlValue}`;
				}
				return `${spaces}${key}: ${yamlValue}`;
			})
			.join("\n");
	}

	// Unreachable - all JSON-compatible types are handled above
	return "null";
};
