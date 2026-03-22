// =============================================================================
// SQL Safety Helpers
// =============================================================================

export const quoteId = (name: string): string => {
	if (name.includes('"') || name.includes("\0"))
		throw new Error(`Invalid SQL identifier: ${name}`);
	return `"${name}"`;
};

export const escapeLiteral = (v: string): string => v.replace(/'/g, "''");

// =============================================================================
// FieldSpec Type System
// =============================================================================

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
	| {
			readonly kind: "object";
			readonly fields: readonly FieldSpec[];
	  }
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

export type { FieldSpec, FieldType };

// =============================================================================
// Snake_case Column Name Helpers
// =============================================================================

export const toSnakeCase = (name: string): string =>
	name
		.replaceAll(/([a-z])([A-Z])/g, "$1_$2")
		.replaceAll(/[-\s]+/g, "_")
		.toLowerCase();

export const toColumnName = (
	prefix: string | undefined,
	name: string,
): string => {
	const snaked = toSnakeCase(name);
	return prefix ? `${prefix}__${snaked}` : snaked;
};

// =============================================================================
// Column Descriptor (flattened output of FieldSpec tree)
// =============================================================================

export interface ColumnDescriptor {
	readonly columnName: string;
	readonly sqlType: string;
	readonly check?: string | undefined;
	readonly nullable: boolean;
}

export interface ChildTableDescriptor {
	readonly childTable: string;
	readonly parentTable: string;
	readonly columns: readonly ColumnDescriptor[];
}

// =============================================================================
// Flatten FieldSpecs to Column Descriptors
// =============================================================================

const fieldTypeToSqlType = (ft: FieldType): string => {
	switch (ft.kind) {
		case "string":
		case "id":
		case "union":
		case "date":
		case "datetime":
			return "TEXT";
		case "float":
			return "REAL";
		case "integer":
			return "INTEGER";
		case "boolean":
			return "INTEGER";
		case "json":
			return "TEXT";
		case "object":
		case "discriminated":
		case "array":
			return "TEXT";
	}
};

export const flattenFields = (
	fields: readonly FieldSpec[],
	tableName: string,
	prefix?: string,
	parentNullable?: boolean,
): { columns: ColumnDescriptor[]; childTables: ChildTableDescriptor[] } => {
	const columns: ColumnDescriptor[] = [];
	const childTables: ChildTableDescriptor[] = [];

	for (const field of fields) {
		const colPrefix = toColumnName(prefix, field.name);
		const nullable = !!(field.nullable || parentNullable);

		switch (field.type.kind) {
			case "string":
			case "float":
			case "integer":
			case "date":
			case "datetime":
			case "boolean":
			case "id":
			case "json":
				columns.push({
					columnName: colPrefix,
					sqlType: fieldTypeToSqlType(field.type),
					nullable,
				});
				break;

			case "union":
				columns.push({
					columnName: colPrefix,
					sqlType: "TEXT",
					check: `${quoteId(colPrefix)} IN (${field.type.values.map((v) => `'${escapeLiteral(v)}'`).join(", ")})`,
					nullable,
				});
				break;

			case "object": {
				const sub = flattenFields(
					field.type.fields,
					tableName,
					colPrefix,
					nullable,
				);
				columns.push(...sub.columns);
				childTables.push(...sub.childTables);
				break;
			}

			case "discriminated": {
				{
					const discCol = toColumnName(colPrefix, field.type.discriminator);
					columns.push({
						columnName: discCol,
						sqlType: "TEXT",
						check: `${quoteId(discCol)} IN (${Object.keys(field.type.variants)
							.map((v) => `'${escapeLiteral(v)}'`)
							.join(", ")})`,
						nullable,
					});
				}
				for (const [variantName, variantFields] of Object.entries(
					field.type.variants,
				)) {
					const sub = flattenFields(
						variantFields,
						tableName,
						`${colPrefix}__${toSnakeCase(variantName)}`,
						true,
					);
					columns.push(...sub.columns);
					childTables.push(...sub.childTables);
				}
				break;
			}

			case "array": {
				const elementColumns = flattenArrayElement(field.type.element);
				childTables.push({
					childTable: field.type.childTable,
					parentTable: tableName,
					columns: elementColumns,
				});
				break;
			}
		}
	}

	return { columns, childTables };
};

export const flattenArrayElement = (element: FieldType): ColumnDescriptor[] => {
	switch (element.kind) {
		case "string":
		case "float":
		case "integer":
		case "date":
		case "datetime":
		case "boolean":
		case "id":
		case "json":
			return [
				{
					columnName: "value",
					sqlType: fieldTypeToSqlType(element),
					nullable: false,
				},
			];
		case "union":
			return [
				{
					columnName: "value",
					sqlType: "TEXT",
					check: `"value" IN (${element.values.map((v) => `'${escapeLiteral(v)}'`).join(", ")})`,
					nullable: false,
				},
			];
		case "object": {
			const sub = flattenFields(element.fields, "");
			return sub.columns.map((c) => ({ ...c, nullable: false }));
		}
		case "discriminated": {
			const discColName = toSnakeCase(element.discriminator);
			const discCol: ColumnDescriptor = {
				columnName: discColName,
				sqlType: "TEXT",
				check: `${quoteId(discColName)} IN (${Object.keys(element.variants)
					.map((v) => `'${escapeLiteral(v)}'`)
					.join(", ")})`,
				nullable: false,
			};
			const variantCols: ColumnDescriptor[] = [];
			for (const [variantName, variantFields] of Object.entries(
				element.variants,
			)) {
				const sub = flattenFields(variantFields, "", toSnakeCase(variantName));
				variantCols.push(...sub.columns.map((c) => ({ ...c, nullable: true })));
			}
			return [discCol, ...variantCols];
		}
		case "array":
			return [
				{
					columnName: "value",
					sqlType: "TEXT",
					nullable: false,
				},
			];
	}
};
