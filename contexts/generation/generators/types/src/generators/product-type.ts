import type { ProductTypeDef, TypeRef } from "@morph/domain-schema";

import { indent } from "@morph/utils";

import { typeRefToSchema } from "../mappers/schema-reference";
import { typeRefToTypeScript } from "../mappers/type-reference";
import {
	buildSchemaContext,
	formatSchemaParams,
	formatTypeParam,
	formatTypeParams,
	hasFunctionFields,
	hasTypeParameters,
} from "./type-utils";

const typeRefReferencesName = (ref: TypeRef, name: string): boolean => {
	switch (ref.kind) {
		case "type":
		case "entity":
		case "valueObject":
			return ref.name === name;
		case "array":
			return typeRefReferencesName(ref.element, name);
		case "optional":
			return typeRefReferencesName(ref.inner, name);
		case "generic":
			return ref.args.some((a) => typeRefReferencesName(a, name));
		default:
			return false;
	}
};

export const generateProductTypeSchema = (
	name: string,
	typeDef: ProductTypeDef,
): string => {
	const typeParamString = formatTypeParams(typeDef.typeParameters);

	// Types with function fields: generate TypeScript interface directly
	if (hasFunctionFields(typeDef.fields)) {
		const interfaceFields = indent(
			Object.entries(typeDef.fields)
				.map(([fieldName, fieldDef]) => {
					const tsType = typeRefToTypeScript(fieldDef.type);
					return `readonly ${fieldName}: ${tsType};`;
				})
				.join("\n"),
			1,
		);

		return [
			`// ${typeDef.description}`,
			`export interface ${name}${typeParamString} {`,
			interfaceFields,
			`}`,
			"",
		].join("\n");
	}

	// Generic types: generate schema factory, derive type from it
	if (hasTypeParameters(typeDef)) {
		const typeParams = typeDef.typeParameters!;
		const ctx = buildSchemaContext(typeParams);

		const schemaTypeParams = typeParams.map(formatTypeParam).join(", ");
		const schemaParams = formatSchemaParams(typeParams);
		const typeParamNames = typeParams.map((p) => p.name).join(", ");

		const schemaFields = indent(
			Object.entries(typeDef.fields)
				.map(([fieldName, fieldDef]) => {
					const schema = typeRefToSchema(fieldDef.type, ctx);
					const optionalWrapper = fieldDef.optional ? "S.optional(" : "";
					const optionalClose = fieldDef.optional ? ")" : "";
					return `${fieldName}: ${optionalWrapper}${schema}${optionalClose},`;
				})
				.join("\n"),
			2,
		);

		return [
			`// ${typeDef.description}`,
			`export const ${name}Schema = <${schemaTypeParams}>(${schemaParams}) =>`,
			indent(`S.Struct({`, 1),
			schemaFields,
			indent(`});`, 1),
			`export type ${name}${typeParamString} = S.Schema.Type<`,
			indent(`ReturnType<typeof ${name}Schema<${typeParamNames}>>`, 1),
			`>;`,
			"",
		].join("\n");
	}

	// Check for self-referential fields (e.g., children: DslSymbol[])
	const isSelfReferential = Object.values(typeDef.fields).some((f) =>
		typeRefReferencesName(f.type, name),
	);

	// Non-generic: generate full Effect Schema
	const fields = indent(
		Object.entries(typeDef.fields)
			.map(([fieldName, fieldDef]) => {
				let baseSchema = typeRefToSchema(fieldDef.type);
				// Wrap self-referential fields in S.suspend
				if (typeRefReferencesName(fieldDef.type, name)) {
					baseSchema = `S.suspend((): S.Schema.Any => ${baseSchema})`;
				}
				const optionalWrapper = fieldDef.optional ? "S.optional(" : "";
				const optionalClose = fieldDef.optional ? ")" : "";
				return `${fieldName}: ${optionalWrapper}${baseSchema}${optionalClose},`;
			})
			.join("\n"),
		1,
	);

	if (isSelfReferential) {
		return [
			`// ${typeDef.description}`,
			`export interface ${name} {`,
			indent(
				Object.entries(typeDef.fields)
					.map(([fieldName, fieldDef]) => {
						const tsType = typeRefToTypeScript(fieldDef.type);
						const optional = fieldDef.optional ? "?" : "";
						return `readonly ${fieldName}${optional}: ${tsType};`;
					})
					.join("\n"),
				1,
			),
			"}",
			"",
			`export const ${name}Schema: S.Schema<${name}, ${name}> = S.Struct({`,
			fields,
			`}) as unknown as S.Schema<${name}, ${name}>;`,
			"",
			`export const parse${name} = S.decodeUnknownSync(${name}Schema);`,
			`export const parse${name}Either = S.decodeUnknownEither(${name}Schema);`,
			`export const encode${name} = S.encodeSync(${name}Schema);`,
			"",
		].join("\n");
	}

	return [
		`// ${typeDef.description}`,
		`export const ${name}Schema = S.Struct({`,
		fields,
		"});",
		"",
		`export type ${name} = S.Schema.Type<typeof ${name}Schema>;`,
		"",
		`export const parse${name} = S.decodeUnknownSync(${name}Schema);`,
		`export const parse${name}Either = S.decodeUnknownEither(${name}Schema);`,
		`export const encode${name} = S.encodeSync(${name}Schema);`,
		"",
	].join("\n");
};
