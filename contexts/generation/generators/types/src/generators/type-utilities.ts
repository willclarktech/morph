import type {
	AliasTypeDef,
	FieldDef,
	ProductTypeDef,
	SumTypeDef,
	TypeParameterDef,
	TypeRef,
} from "@morphdsl/domain-schema";

import type { SchemaContext } from "../mappers/schema-reference";

import { typeRefToTypeScript } from "../mappers/type-reference";

export const formatTypeParam = (param: TypeParameterDef): string => {
	let result = param.name;
	if (param.constraint) {
		result += ` extends ${typeRefToTypeScript(param.constraint)}`;
	}
	if (param.default) {
		result += ` = ${typeRefToTypeScript(param.default)}`;
	}
	return result;
};

export const formatTypeParams = (
	typeParams: readonly TypeParameterDef[] | undefined,
): string => {
	if (!typeParams || typeParams.length === 0) {
		return "";
	}
	return `<${typeParams.map(formatTypeParam).join(", ")}>`;
};

export const hasTypeParameters = (
	typeDef: AliasTypeDef | ProductTypeDef | SumTypeDef,
): boolean => {
	return (
		typeDef.typeParameters !== undefined && typeDef.typeParameters.length > 0
	);
};

export const containsFunctionType = (ref: TypeRef): boolean => {
	switch (ref.kind) {
		case "array": {
			return containsFunctionType(ref.element);
		}
		case "entity":
		case "entityId":
		case "primitive":
		case "type":
		case "typeParam":
		case "union":
		case "valueObject": {
			return false;
		}
		case "function": {
			return true;
		}
		case "generic": {
			return ref.args.some(containsFunctionType);
		}
		case "optional": {
			return containsFunctionType(ref.inner);
		}
	}
};

export const hasFunctionFields = (
	fields: Record<string, FieldDef>,
): boolean => {
	return Object.values(fields).some((field) =>
		containsFunctionType(field.type),
	);
};

const schemaParamName = (name: string): string => `schema${name}`;

export const buildSchemaContext = (
	typeParams: readonly TypeParameterDef[],
): SchemaContext => ({
	typeParams: Object.fromEntries(
		typeParams.map((p) => [p.name, schemaParamName(p.name)]),
	),
});

export const formatSchemaParams = (
	typeParams: readonly TypeParameterDef[],
): string => {
	return typeParams
		.map((p) => {
			const paramName = schemaParamName(p.name);
			return `${paramName}: S.Schema<${p.name}, ${p.name}>`;
		})
		.join(", ");
};
