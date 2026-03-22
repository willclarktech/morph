import type { DomainSchema, TypeDef } from "@morph/domain-schema";

import { getAllTypes, getTypesForContext } from "@morph/domain-schema";

import { generateAliasTypeSchema } from "./alias-type";
import { generateProductTypeSchema } from "./product-type";
import { generateSumTypeSchema } from "./sum-type";
import { topologicalSort } from "./type-deps";

export type { SchemaContext } from "../mappers/schema-reference";
export { generateAliasTypeSchema } from "./alias-type";
export { generateProductTypeSchema } from "./product-type";
export { generateSumTypeSchema } from "./sum-type";

export interface GenerateTypeSchemasOptions {
	readonly contextName?: string | undefined;
}

export const generateTypeSchemas = (
	schema: DomainSchema,
	options: GenerateTypeSchemasOptions = {},
): string => {
	const allTypes = options.contextName
		? getTypesForContext(schema, options.contextName)
		: getAllTypes(schema);
	const types = topologicalSort(
		allTypes.map((entry) => [entry.name, entry.def] as const),
	);

	if (types.length === 0) {
		return "";
	}

	const typeSchemas = types.map(([name, typeDef]) =>
		generateTypeSchema(name, typeDef),
	);

	const sections = [
		"// Pure Type Schemas (transformation-centric)",
		"",
		...typeSchemas,
	];

	return sections.join("\n");
};

const generateTypeSchema = (name: string, typeDef: TypeDef): string => {
	switch (typeDef.kind) {
		case "alias": {
			return generateAliasTypeSchema(name, typeDef);
		}
		case "product": {
			return generateProductTypeSchema(name, typeDef);
		}
		case "sum": {
			return generateSumTypeSchema(name, typeDef);
		}
	}
};
