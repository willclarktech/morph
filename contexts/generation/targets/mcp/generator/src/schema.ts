import type * as S from "effect/Schema";
/**
 * Effect Schema to Zod conversion utilities.
 *
 * Converts Effect Schema AST to equivalent Zod schemas for MCP tool registration.
 */
import type * as AST from "effect/SchemaAST";

import { z } from "zod";

/**
 * Zod raw shape type for MCP tool registration.
 */
export type ZodRawShape = Record<string, z.ZodType>;

/**
 * Convert an Effect Schema to a Zod raw shape (for MCP tool registration).
 * Returns the shape of the object schema, suitable for server.tool().
 */
export const effectSchemaToZodShape = (
	schema: S.Schema.All,
	excludeFields: readonly string[] = [],
): ZodRawShape => {
	const ast = schema.ast;
	if (ast._tag !== "TypeLiteral") {
		// If not an object type, return empty shape
		return {};
	}

	const exclude = new Set(excludeFields);
	const shape: ZodRawShape = {};
	for (const propertySignature of ast.propertySignatures) {
		const name = String(propertySignature.name);

		// Skip fields that will be injected from auth context
		if (exclude.has(name)) {
			continue;
		}

		let fieldSchema = astToZod(propertySignature.type);

		if (propertySignature.isOptional) {
			fieldSchema = fieldSchema.optional();
		}

		shape[name] = fieldSchema;
	}

	return shape;
};

/**
 * Convert an Effect Schema to a Zod schema.
 * Traverses the Effect Schema AST and builds an equivalent Zod schema.
 */
export const effectSchemaToZod = (schema: S.Schema.All): z.ZodType => {
	return astToZod(schema.ast);
};

/**
 * Convert an Effect Schema AST node to a Zod schema.
 */
const astToZod = (ast: AST.AST): z.ZodType => {
	switch (ast._tag) {
		case "AnyKeyword":
		case "BigIntKeyword":
		case "Enums":
		case "ObjectKeyword":
		case "SymbolKeyword":
		case "TemplateLiteral":
		case "UniqueSymbol":
		case "VoidKeyword": {
			// Unsupported types - return unknown
			return z.unknown();
		}

		case "BooleanKeyword": {
			return z.boolean();
		}

		case "Declaration": {
			// Declarations wrap other types (like branded types)
			// Get the underlying type
			const typeParameters = ast.typeParameters;
			const firstParameter = typeParameters[0];
			if (firstParameter) {
				return astToZod(firstParameter);
			}
			return z.unknown();
		}

		case "Literal": {
			const value = ast.literal;
			if (typeof value === "string") return z.literal(value);
			if (typeof value === "number") return z.literal(value);
			if (typeof value === "boolean") return z.literal(value);
			return z.unknown();
		}

		case "NeverKeyword": {
			return z.never();
		}

		case "NumberKeyword": {
			return z.number();
		}

		case "Refinement": {
			// Refinements add constraints to a base type
			const baseZod = astToZod(ast.from);

			// Check for pattern annotation (from S.pattern())
			const jsonSchemaAnnotation = ast.annotations[
				Symbol.for("effect/annotation/JSONSchema")
			] as { pattern?: string } | undefined;

			if (jsonSchemaAnnotation?.pattern && baseZod instanceof z.ZodString) {
				return baseZod.regex(new RegExp(jsonSchemaAnnotation.pattern));
			}

			return baseZod;
		}

		case "StringKeyword": {
			return z.string();
		}

		case "Suspend": {
			// Lazy/recursive types
			return z.lazy(() => astToZod(ast.f()));
		}

		case "Transformation": {
			// Transformations map between types - use the "from" type for input
			return astToZod(ast.from);
		}

		case "TupleType": {
			// Handle arrays
			if (ast.rest.length > 0) {
				const firstRest = ast.rest[0];
				if (firstRest) {
					return z.array(astToZod(firstRest.type));
				}
			}
			return z.array(z.unknown());
		}

		case "TypeLiteral": {
			// Object type
			const shape: Record<string, z.ZodType> = {};
			const requiredKeys = new Set<string>();

			for (const propertySignature of ast.propertySignatures) {
				const name = String(propertySignature.name);
				let fieldSchema = astToZod(propertySignature.type);

				if (propertySignature.isOptional) {
					fieldSchema = fieldSchema.optional();
				} else {
					requiredKeys.add(name);
				}

				shape[name] = fieldSchema;
			}

			return z.object(shape);
		}

		case "UndefinedKeyword": {
			return z.undefined();
		}

		case "Union": {
			// Handle union types
			const types = ast.types.map((type) => astToZod(type));
			const firstType = types[0];
			if (types.length === 0) return z.never();
			if (types.length === 1 && firstType) return firstType;

			// Filter out undefined for optional handling
			const nonUndefined = ast.types.filter(
				(type) => type._tag !== "UndefinedKeyword",
			);
			const firstNonUndefined = nonUndefined[0];
			if (
				nonUndefined.length === 1 &&
				ast.types.length === 2 &&
				firstNonUndefined
			) {
				// This is an optional type (T | undefined)
				return astToZod(firstNonUndefined).optional();
			}

			// Build union
			const [first, second, ...rest] = types;
			if (!first || !second) return first ?? z.never();
			return z.union([first, second, ...rest]);
		}

		case "UnknownKeyword": {
			return z.unknown();
		}

		default: {
			// For unhandled cases, return unknown
			return z.unknown();
		}
	}
};

/**
 * Get description annotations from an Effect Schema.
 */
export const getSchemaDescription = (
	schema: S.Schema.All,
): string | undefined => {
	const annotations = schema.ast.annotations;
	if ("description" in annotations) {
		return annotations["description"] as string;
	}
	return undefined;
};
