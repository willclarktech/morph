import type { AliasTypeDef } from "@morph/domain-schema";

import { typeRefToSchema } from "../mappers/schema-reference";
import { typeRefToTypeScript } from "../mappers/type-reference";
import { formatTypeParams, hasTypeParameters } from "./type-utilities";

export const generateAliasTypeSchema = (
	name: string,
	typeDef: AliasTypeDef,
): string => {
	const typeParamString = formatTypeParams(typeDef.typeParameters);

	// Generic types: type alias only (can't derive from schema)
	if (hasTypeParameters(typeDef)) {
		const tsType = typeRefToTypeScript(typeDef.type);
		return [
			`// ${typeDef.description}`,
			`export type ${name}${typeParamString} = ${tsType};`,
			"",
		].join("\n");
	}

	// Alias to generic instantiation: generate schema, derive type from it
	if (typeDef.type.kind === "generic") {
		const schemaExpr = typeRefToSchema(typeDef.type);
		return [
			`// ${typeDef.description}`,
			`export const ${name}Schema = ${schemaExpr};`,
			`export type ${name} = S.Schema.Type<typeof ${name}Schema>;`,
			"",
		].join("\n");
	}

	// Non-generic: generate full Effect Schema
	const targetSchema = typeRefToSchema(typeDef.type);

	return [
		`// ${typeDef.description}`,
		`export const ${name}Schema = ${targetSchema};`,
		"",
		`export type ${name} = S.Schema.Type<typeof ${name}Schema>;`,
		"",
	].join("\n");
};
