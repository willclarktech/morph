import type { DomainSchema } from "@morphdsl/domain-schema";

import { getAllEntities, getAllOperations } from "@morphdsl/domain-schema";

import { isTimestampType } from "./type-mapping";

const capitalize = (s: string): string =>
	s.charAt(0).toUpperCase() + s.slice(1);

export const generateDateFieldsModule = (schema: DomainSchema): string => {
	const entries: string[] = [];
	const package_ = schema.name.toLowerCase();

	for (const entity of getAllEntities(schema)) {
		const dateFields = Object.entries(entity.def.attributes)
			.filter(([, attribute]) => isTimestampType(attribute.type))
			.map(([name]) => `"${name}"`);
		if (dateFields.length > 0) {
			entries.push(
				`\t"${package_}.${entity.name}": [${dateFields.join(", ")}]`,
			);
		}
	}

	for (const op of getAllOperations(schema)) {
		const dateFields = Object.entries(op.def.input)
			.filter(([, param]) => isTimestampType(param.type))
			.map(([name]) => `"${name}"`);
		if (dateFields.length > 0) {
			entries.push(
				`\t"${package_}.${capitalize(op.name)}Input": [${dateFields.join(", ")}]`,
			);
		}
	}

	if (entries.length === 0) {
		return `export const DATE_FIELDS: Record<string, readonly string[]> = {};\n`;
	}

	return `export const DATE_FIELDS: Record<string, readonly string[]> = {\n${entries.join(",\n")},\n};\n`;
};
