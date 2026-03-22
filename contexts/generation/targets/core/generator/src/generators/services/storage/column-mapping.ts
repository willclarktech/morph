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
} from "@morph/domain-schema";

import { getForeignKeyAttributes } from "@morph/domain-schema";
import { toSnakeCase } from "@morph/utils";

// Mirror of runtime types from @morph/storage-sqlite-impls.
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
	| { readonly kind: "object"; readonly fields: readonly FieldSpec[] }
	| {
			readonly kind: "discriminated";
			readonly discriminator: string;
			readonly variants: Record<string, readonly FieldSpec[]>;
	  }
	| {
			readonly kind: "array";
			readonly element: FieldType;
			readonly childTable: string;
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
		.map(([name, attr]) =>
			attributeToFieldSpec(name, attr, entityLower, context, schema),
		);
};

const attributeToFieldSpec = (
	name: string,
	attr: AttributeDef,
	entityLower: string,
	context: ContextDef,
	schema: DomainSchema,
): FieldSpec => {
	const nullable = attr.optional === true;

	if (attr.type.kind === "optional") {
		return {
			name,
			type: typeRefToFieldType(
				attr.type.inner,
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
		type: typeRefToFieldType(attr.type, name, entityLower, context, schema),
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
		case "primitive":
			switch (typeRef.name) {
				case "string":
					return { kind: "string" };
				case "float":
					return { kind: "float" };
				case "integer":
					return { kind: "integer" };
				case "date":
					return { kind: "date" };
				case "datetime":
					return { kind: "datetime" };
				case "boolean":
					return { kind: "boolean" };
				default:
					return { kind: "json" };
			}

		case "entityId":
			return { kind: "id" };

		case "union":
			return { kind: "union", values: typeRef.values };

		case "valueObject": {
			const voDef = resolveValueObject(typeRef.name, context, schema);
			if (!voDef) return { kind: "json" };
			return {
				kind: "object",
				fields: valueObjectToFieldSpecs(voDef, entityLower, context, schema),
			};
		}

		case "type": {
			const typeDef = resolveType(typeRef.name, context, schema);
			if (!typeDef) return { kind: "json" };

			switch (typeDef.kind) {
				case "product":
					return {
						kind: "object",
						fields: productTypeToFieldSpecs(
							typeDef.fields,
							entityLower,
							context,
							schema,
						),
					};
				case "sum":
					return sumTypeToFieldType(typeDef, entityLower, context, schema);
				case "alias":
					return typeRefToFieldType(
						typeDef.type,
						fieldName,
						entityLower,
						context,
						schema,
					);
			}
			return { kind: "json" };
		}

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

		case "optional":
			return typeRefToFieldType(
				typeRef.inner,
				fieldName,
				entityLower,
				context,
				schema,
			);

		default:
			return { kind: "json" };
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
		.map(([name, attr]) => ({
			name,
			type: typeRefToFieldType(attr.type, name, entityLower, context, schema),
			nullable: attr.optional === true,
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
	return Object.values(schema.contexts)[0]!;
};

const resolveValueObject = (
	name: string,
	context: ContextDef,
	schema: DomainSchema,
): ValueObjectDef | undefined => {
	const local = context.valueObjects?.[name];
	if (local) return local;
	for (const ctx of Object.values(schema.contexts)) {
		const found = ctx.valueObjects?.[name];
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
	for (const ctx of Object.values(schema.contexts)) {
		const found = ctx.types?.[name];
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
	const parts: string[] = [
		`${inner}{ name: "${spec.name}", type: ${fieldTypeToCode(spec.type, inner)}`,
	];
	if (spec.nullable) {
		parts[0] += ", nullable: true";
	}
	parts[0] += " }";
	return parts.join("");
};

const fieldTypeToCode = (ft: FieldType, indent: string): string => {
	switch (ft.kind) {
		case "string":
			return '{ kind: "string" }';
		case "float":
			return '{ kind: "float" }';
		case "integer":
			return '{ kind: "integer" }';
		case "date":
			return '{ kind: "date" }';
		case "datetime":
			return '{ kind: "datetime" }';
		case "boolean":
			return '{ kind: "boolean" }';
		case "id":
			return '{ kind: "id" }';
		case "json":
			return '{ kind: "json" }';
		case "union":
			return `{ kind: "union", values: [${ft.values.map((v) => `"${v}"`).join(", ")}] }`;
		case "object": {
			const inner = indent + "\t";
			const fieldsCode = ft.fields
				.map((f) => fieldSpecToCode(f, inner))
				.join(",\n");
			return `{ kind: "object", fields: [\n${fieldsCode},\n${indent}\t] }`;
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
		case "array":
			return `{ kind: "array", element: ${fieldTypeToCode(ft.element, indent)}, childTable: "${ft.childTable}" }`;
	}
};

/**
 * Build index descriptors for an entity.
 */
export const entityToIndexSpecs = (
	entry: AggregateRootEntry,
): readonly { kind: "unique" | "nonUnique"; field: string }[] => {
	const uniqueAttrs = Object.entries(entry.def.attributes)
		.filter(
			([, attr]) => attr.constraints?.some((c) => c.kind === "unique") ?? false,
		)
		.map(([name]) => ({ kind: "unique" as const, field: name }));

	const fkAttrs = getForeignKeyAttributes(entry.def).map((fk) => ({
		kind: "nonUnique" as const,
		field: fk.name,
	}));

	return [...uniqueAttrs, ...fkAttrs];
};
