import type * as S from "effect/Schema";

import { getFieldNames } from "@morphdsl/operation";

export const getSchemaDescription = (
	schema: S.Schema.All,
	fieldName: string,
): string | undefined => {
	const ast = schema.ast;
	if (ast._tag !== "TypeLiteral") return undefined;

	const property = ast.propertySignatures.find(
		(ps) => String(ps.name) === fieldName,
	);
	if (!property) return undefined;

	const descSymbol = Symbol.for("effect/annotation/Description");

	// Check for annotations on the property signature (optional params)
	const propAnnotations = property.annotations;
	const propDesc = propAnnotations[descSymbol];
	if (typeof propDesc === "string") return propDesc;

	// Check for annotations on the property type (required params)
	const typeAnnotations = property.type.annotations;
	const typeDesc = typeAnnotations[descSymbol];
	if (typeof typeDesc === "string") return typeDesc;

	return undefined;
};

const isSensitiveParam = (schema: S.Schema.All, fieldName: string): boolean => {
	const ast = schema.ast;
	if (ast._tag !== "TypeLiteral") return false;

	const property = ast.propertySignatures.find(
		(ps) => String(ps.name) === fieldName,
	);
	if (!property) return false;

	// Check for sensitive annotation on property signature (optional params)
	const propAnnotations = property.annotations;
	if (propAnnotations["sensitive"] === true) return true;

	// Check for sensitive annotation on property type (required params)
	const typeAnnotations = property.type.annotations;
	if (typeAnnotations["sensitive"] === true) return true;

	return false;
};

/**
 * Operation type for schema inspection.
 */
interface SchemaOperation {
	readonly params: S.Schema.All;
}

export const getSensitiveParameters = (
	operation: SchemaOperation,
): string[] => {
	const parameterNames = getFieldNames(operation.params);
	return parameterNames.filter((name) =>
		isSensitiveParam(operation.params, name),
	);
};

/**
 * Check if the 'schema' parameter in an operation expects a primitive string.
 * This is used to determine whether to parse --schema-file as JSON or pass raw content.
 */
export const isSchemaParamPrimitiveString = (
	paramsSchema: S.Schema.All,
): boolean => {
	const ast = paramsSchema.ast;
	if (ast._tag !== "TypeLiteral") return false;

	const schemaProp = ast.propertySignatures.find(
		(prop) => prop.name === "schema",
	);
	if (!schemaProp) return false;

	// Check if the type is a string primitive
	const type = schemaProp.type;
	return type._tag === "StringKeyword";
};
