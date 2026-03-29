import type { DomainSchema } from "@morphdsl/domain-schema";

import { getAllEntities } from "@morphdsl/domain-schema";

/**
 * Generate named union type aliases from a DomainSchema.
 */
export const generateUnionTypes = (schema: DomainSchema): string => {
	const unions = collectUnionTypes(schema);

	if (unions.length === 0) {
		return "";
	}

	const types = unions.map(
		([name, values]) =>
			`export type ${name} = ${values.map((v) => `"${v}"`).join(" | ")};`,
	);

	return ["// Union Type Aliases", "", ...types].join("\n");
};

const collectUnionTypes = (
	schema: DomainSchema,
): readonly [string, readonly string[]][] =>
	getAllEntities(schema).flatMap((entry) =>
		Object.entries(entry.def.attributes)
			.filter(([, attribute]) => attribute.type.kind === "union")
			.map(([attributeName, attribute]) => {
				const typeName = `${entry.name}${capitalize(attributeName)}`;
				const values =
					attribute.type.kind === "union" ? attribute.type.values : [];
				return [typeName, values] as [string, readonly string[]];
			}),
	);

const capitalize = (s: string): string =>
	s.charAt(0).toUpperCase() + s.slice(1);
