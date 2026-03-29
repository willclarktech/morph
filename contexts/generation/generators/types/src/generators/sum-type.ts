import type { SumTypeDef } from "@morphdsl/domain-schema";

import { indent } from "@morphdsl/utils";

import { typeRefToSchema } from "../mappers/schema-reference";
import {
	buildSchemaContext,
	formatSchemaParams,
	formatTypeParam,
	formatTypeParams,
	hasTypeParameters,
} from "./type-utilities";

export const generateSumTypeSchema = (
	name: string,
	typeDef: SumTypeDef,
): string => {
	const discriminator = typeDef.discriminator;
	const typeParamString = formatTypeParams(typeDef.typeParameters);

	// Generic types: generate schema factory, derive type from it
	if (hasTypeParameters(typeDef) && typeDef.typeParameters) {
		const typeParams = typeDef.typeParameters;
		const context = buildSchemaContext(typeParams);

		const schemaTypeParams = typeParams.map(formatTypeParam).join(", ");
		const schemaParams = formatSchemaParams(typeParams);
		const typeParamNames = typeParams.map((p) => p.name).join(", ");

		const variantSchemas = Object.entries(typeDef.variants).map(
			([variantName, variantDef]) => {
				const fields = Object.entries(variantDef.fields ?? {})
					.map(([fieldName, fieldDef]) => {
						const schema = typeRefToSchema(fieldDef.type, context);
						const optionalWrapper = fieldDef.optional ? "S.optional(" : "";
						const optionalClose = fieldDef.optional ? ")" : "";
						return `${fieldName}: ${optionalWrapper}${schema}${optionalClose},`;
					})
					.join("\n");

				const variantContent = [
					`S.Struct({`,
					indent(`${discriminator}: S.Literal("${variantName}"),`, 1),
					fields ? indent(fields, 1) : undefined,
					`}),`,
				]
					.filter(Boolean)
					.join("\n");

				return indent(variantContent, 2);
			},
		);

		return [
			`// ${typeDef.description}`,
			`export const ${name}Schema = <${schemaTypeParams}>(${schemaParams}) =>`,
			indent(`S.Union(`, 1),
			...variantSchemas,
			indent(`);`, 1),
			`export type ${name}${typeParamString} = S.Schema.Type<`,
			indent(`ReturnType<typeof ${name}Schema<${typeParamNames}>>`, 1),
			`>;`,
			"",
		].join("\n");
	}

	// Non-generic: generate full Effect Schema
	const variantSchemas = Object.entries(typeDef.variants).map(
		([variantName, variantDef]) => {
			const fields = Object.entries(variantDef.fields ?? {})
				.map(([fieldName, fieldDef]) => {
					const baseSchema = typeRefToSchema(fieldDef.type);
					const optionalWrapper = fieldDef.optional ? "S.optional(" : "";
					const optionalClose = fieldDef.optional ? ")" : "";
					return `${fieldName}: ${optionalWrapper}${baseSchema}${optionalClose},`;
				})
				.join("\n");

			const variantContent = [
				`S.Struct({`,
				indent(`${discriminator}: S.Literal("${variantName}"),`, 1),
				fields ? indent(fields, 1) : undefined,
				`}),`,
			]
				.filter(Boolean)
				.join("\n");

			return indent(variantContent, 1);
		},
	);

	return [
		`// ${typeDef.description}`,
		`export const ${name}Schema = S.Union(`,
		...variantSchemas,
		");",
		"",
		`export type ${name} = S.Schema.Type<typeof ${name}Schema>;`,
		"",
		`export const parse${name} = S.decodeUnknownSync(${name}Schema);`,
		`export const parse${name}Either = S.decodeUnknownEither(${name}Schema);`,
		`export const encode${name} = S.encodeSync(${name}Schema);`,
		"",
	].join("\n");
};
