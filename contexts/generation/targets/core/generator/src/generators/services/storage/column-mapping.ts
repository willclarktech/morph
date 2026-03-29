/**
 * Column mapping: converts entity definitions to FieldSpec arrays for relational storage.
 * Maps TypeRef → FieldType for all morph types.
 */

import type {
	AttributeDef,
	ContextDef,
	DomainSchema,
	EntityDef,
	FieldDef,
	SumTypeDef,
	TypeDef,
	TypeRef,
	ValueObjectDef,
} from "@morphdsl/domain-schema";

import { getForeignKeyAttributes } from "@morphdsl/domain-schema";
import { toSnakeCase } from "@morphdsl/utils";

// Mirror of runtime types from @morphdsl/storage-sqlite-impls.
// Defined locally so the generator doesn't depend on the runtime package.

type FieldType =
	| { readonly kind: "string" }
	| { readonly kind: "float" }
	| { readonly kind: "integer" }
	| { readonly kind: "date" }
	| { readonly kind: "datetime" }
	| { readonly kind: "boolean" }
	| { readonly kind: "id" }
	| { readonly kind: "union"; readonly values: readonly string[] }
	| { readonly kind: "json" }
	| { readonly fields: readonly FieldSpec[]; readonly kind: "object" }
	| {
			readonly discriminator: string;
			readonly kind: "discriminated";
			readonly variants: Record<string, readonly FieldSpec[]>;
	  }
	| {
			readonly childTable: string;
			readonly element: FieldType;
			readonly kind: "array";
	  };

interface FieldSpec {
	readonly name: string;
	readonly type: FieldType;
	readonly nullable?: boolean | undefined;
}

interface AggregateRootEntry {
	readonly name: string;
	readonly def: EntityDef;
}

/**
 * Convert an entity definition to FieldSpec array for relational storage.
 * Skips the 'id' attribute (handled as PRIMARY KEY).
 */
export const entityToFieldSpecs = (
	entry: AggregateRootEntry,
	schema: DomainSchema,
): readonly FieldSpec[] => {
	const context = findContextForEntity(entry.name, schema);
	const entityLower = entry.name.toLowerCase();
	return Object.entries(entry.def.attributes)
		.filter(([name]) => name !== "id")
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([name, attribute]) =>
			attributeToFieldSpec(name, attribute, entityLower, context, schema),
		);
};

const attributeToFieldSpec = (
	name: string,
	attribute: AttributeDef,
	entityLower: string,
	context: ContextDef,
	schema: DomainSchema,
): FieldSpec => {
	const nullable = attribute.optional === true;

	if (attribute.type.kind === "optional") {
		return {
			name,
			type: typeRefToFieldType(
				attribute.type.inner,
				name,
				entityLower,
				context,
				schema,
			),
			nullable: true,
		};
	}

	return {
		name,
		type: typeRefToFieldType(
			attribute.type,
			name,
			entityLower,
			context,
			schema,
		),
		nullable,
	};
};

const typeRefToFieldType = (
	typeRef: TypeRef,
	fieldName: string,
	entityLower: string,
	context: ContextDef,
	schema: DomainSchema,
): FieldType => {
	switch (typeRef.kind) {
		case "array": {
			const elementType = typeRefToFieldType(
				typeRef.element,
				fieldName,
				entityLower,
				context,
				schema,
			);
			return {
				kind: "array",
				element: elementType,
				childTable: `${entityLower}_${toSnakeCase(fieldName)}`,
			};
		}

		case "entity":
		case "function":
		case "generic":
		case "typeParam": {
			return { kind: "json" };
		}

		case "entityId": {
			return { kind: "id" };
		}

		case "optional": {
			return typeRefToFieldType(
				typeRef.inner,
				fieldName,
				entityLower,
				context,
				schema,
			);
		}

		case "primitive": {
			switch (typeRef.name) {
				case "boolean": {
					return { kind: "boolean" };
				}
				case "date": {
					return { kind: "date" };
				}
				case "datetime": {
					return { kind: "datetime" };
				}
				case "float": {
					return { kind: "float" };
				}
				case "integer": {
					return { kind: "integer" };
				}
				case "string": {
					return { kind: "string" };
				}
				case "unknown":
				case "void": {
					return { kind: "json" };
				}
			}
			return { kind: "json" };
		}
		case "type": {
			const typeDef = resolveType(typeRef.name, context, schema);
			if (!typeDef) return { kind: "json" };

			switch (typeDef.kind) {
				case "alias": {
					return typeRefToFieldType(
						typeDef.type,
						fieldName,
						entityLower,
						context,
						schema,
					);
				}
				case "product": {
					return {
						kind: "object",
						fields: productTypeToFieldSpecs(
							typeDef.fields,
							entityLower,
							context,
							schema,
						),
					};
				}
				case "sum": {
					return sumTypeToFieldType(typeDef, entityLower, context, schema);
				}
			}
			return { kind: "json" };
		}
		case "union": {
			return { kind: "union", values: typeRef.values };
		}
		case "valueObject": {
			const voDef = resolveValueObject(typeRef.name, context, schema);
			if (!voDef) return { kind: "json" };
			return {
				kind: "object",
				fields: valueObjectToFieldSpecs(voDef, entityLower, context, schema),
			};
		}
	}
};

const valueObjectToFieldSpecs = (
	voDef: ValueObjectDef,
	entityLower: string,
	context: ContextDef,
	schema: DomainSchema,
): readonly FieldSpec[] =>
	Object.entries(voDef.attributes)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([name, attribute]) => ({
			name,
			type: typeRefToFieldType(
				attribute.type,
				name,
				entityLower,
				context,
				schema,
			),
			nullable: attribute.optional === true,
		}));

const productTypeToFieldSpecs = (
	fields: Record<string, FieldDef>,
	entityLower: string,
	context: ContextDef,
	schema: DomainSchema,
): readonly FieldSpec[] =>
	Object.entries(fields)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([name, field]) => ({
			name,
			type: typeRefToFieldType(field.type, name, entityLower, context, schema),
			nullable: field.optional === true,
		}));

const sumTypeToFieldType = (
	sumDef: SumTypeDef,
	entityLower: string,
	context: ContextDef,
	schema: DomainSchema,
): FieldType => {
	const variants: Record<string, readonly FieldSpec[]> = {};
	for (const [variantName, variantDef] of Object.entries(sumDef.variants)) {
		const fields = variantDef.fields
			? productTypeToFieldSpecs(variantDef.fields, entityLower, context, schema)
			: [];
		variants[variantName] = fields;
	}
	return {
		kind: "discriminated",
		discriminator: sumDef.discriminator,
		variants,
	};
};

// =============================================================================
// Schema Lookup Helpers
// =============================================================================

const findContextForEntity = (
	entityName: string,
	schema: DomainSchema,
): ContextDef => {
	for (const context of Object.values(schema.contexts)) {
		if (entityName in context.entities) return context;
	}
	// Schema always has at least one context when this is called
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- guaranteed by caller
	return Object.values(schema.contexts)[0]!;
};

const resolveValueObject = (
	name: string,
	context: ContextDef,
	schema: DomainSchema,
): ValueObjectDef | undefined => {
	const local = context.valueObjects?.[name];
	if (local) return local;
	for (const context_ of Object.values(schema.contexts)) {
		const found = context_.valueObjects?.[name];
		if (found) return found;
	}
	return undefined;
};

const resolveType = (
	name: string,
	context: ContextDef,
	schema: DomainSchema,
): TypeDef | undefined => {
	const local = context.types?.[name];
	if (local) return local;
	for (const context_ of Object.values(schema.contexts)) {
		const found = context_.types?.[name];
		if (found) return found;
	}
	return undefined;
};

// =============================================================================
// Build RelationalTableConfig code string for a single entity
// =============================================================================

/**
 * Generate the code for a RelationalTableConfig literal.
 * Used by the relational-config generator to emit TypeScript source.
 */
export const fieldSpecsToCodeString = (
	specs: readonly FieldSpec[],
	indent: string,
): string => {
	const lines = specs.map((spec) => fieldSpecToCode(spec, indent));
	return `[\n${lines.join(",\n")},\n${indent}]`;
};

const fieldSpecToCode = (spec: FieldSpec, indent: string): string => {
	const inner = indent + "\t";
	let line = `${inner}{ name: "${spec.name}", type: ${fieldTypeToCode(spec.type, inner)}`;
	if (spec.nullable) {
		line += ", nullable: true";
	}
	line += " }";
	return line;
};

const fieldTypeToCode = (ft: FieldType, indent: string): string => {
	switch (ft.kind) {
		case "array": {
			return `{ kind: "array", element: ${fieldTypeToCode(ft.element, indent)}, childTable: "${ft.childTable}" }`;
		}
		case "boolean": {
			return '{ kind: "boolean" }';
		}
		case "date": {
			return '{ kind: "date" }';
		}
		case "datetime": {
			return '{ kind: "datetime" }';
		}
		case "discriminated": {
			const inner = indent + "\t";
			const variantEntries = Object.entries(ft.variants)
				.map(([name, fields]) => {
					const fieldsCode = fields
						.map((f) => fieldSpecToCode(f, inner + "\t"))
						.join(",\n");
					return `${inner}\t${name}: [\n${fieldsCode},\n${inner}\t]`;
				})
				.join(",\n");
			return `{ kind: "discriminated", discriminator: "${ft.discriminator}", variants: {\n${variantEntries},\n${inner}} }`;
		}
		case "float": {
			return '{ kind: "float" }';
		}
		case "id": {
			return '{ kind: "id" }';
		}
		case "integer": {
			return '{ kind: "integer" }';
		}
		case "json": {
			return '{ kind: "json" }';
		}
		case "object": {
			const inner = indent + "\t";
			const fieldsCode = ft.fields
				.map((f) => fieldSpecToCode(f, inner))
				.join(",\n");
			return `{ kind: "object", fields: [\n${fieldsCode},\n${indent}\t] }`;
		}
		case "string": {
			return '{ kind: "string" }';
		}
		case "union": {
			return `{ kind: "union", values: [${ft.values.map((v) => `"${v}"`).join(", ")}] }`;
		}
	}
};

/**
 * Build index descriptors for an entity.
 */
export const entityToIndexSpecs = (
	entry: AggregateRootEntry,
): readonly { field: string; kind: "unique" | "nonUnique" }[] => {
	const uniqueAttributes = Object.entries(entry.def.attributes)
		.filter(
			([, attribute]) =>
				attribute.constraints?.some((c) => c.kind === "unique") ?? false,
		)
		.map(([name]) => ({ kind: "unique" as const, field: name }));

	const fkAttributes = getForeignKeyAttributes(entry.def).map((fk) => ({
		kind: "nonUnique" as const,
		field: fk.name,
	}));

	return [...uniqueAttributes, ...fkAttributes];
};
