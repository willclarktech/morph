import type {
	EntityStore,
	IndexDescriptor,
	PaginationParams,
} from "@morphdsl/storage-dsl";
import type { Database, Statement } from "bun:sqlite";

import { applyPagination, StorageOperationError } from "@morphdsl/storage-dsl";
import { jsonParse, jsonStringify } from "@morphdsl/utils";
import { Effect } from "effect";

import type {
	ChildTableDescriptor,
	ColumnDescriptor,
	FieldSpec,
	FieldType,
} from "./field-flattening";

import {
	flattenArrayElement,
	flattenFields,
	quoteId,
	toColumnName,
	toSnakeCase,
} from "./field-flattening";

interface RelationalTableConfig {
	readonly tableName: string;
	readonly fields: readonly FieldSpec[];
	readonly indexes: readonly IndexDescriptor[];
}

export type { RelationalTableConfig };

const PARENT_ID_COL = "parent_id";

// SQLite requires null for NULL columns; eslint-disable unavoidable here
// eslint-disable-next-line unicorn/no-null
const SQL_NULL = null;

// =============================================================================
// Schema Reconciliation
// =============================================================================

interface ExistingColumn {
	name: string;
	type: string;
	notnull: number;
}

interface ExistingIndex {
	name: string;
}

const reconcileSchema = (
	database: Database,
	config: RelationalTableConfig,
): readonly string[] => {
	const { columns, childTables } = flattenFields(
		config.fields,
		config.tableName,
	);

	const warnings: string[] = [];

	database.transaction(() => {
		const tableExists =
			database
				.query<
					{ cnt: number },
					[string]
				>("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name=?")
				.get(config.tableName)?.cnt ?? 0;

		if (tableExists === 0) {
			createMainTable(database, config.tableName, columns, config.indexes);
		} else {
			reconcileMainTable(
				database,
				config.tableName,
				columns,
				config.indexes,
				warnings,
			);
		}

		for (const ct of childTables) {
			const ctExists =
				database
					.query<
						{ cnt: number },
						[string]
					>("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name=?")
					.get(ct.childTable)?.cnt ?? 0;

			if (ctExists === 0) {
				createChildTable(database, ct);
			}
		}
	})();

	return warnings;
};

const createMainTable = (
	database: Database,
	tableName: string,
	columns: readonly ColumnDescriptor[],
	indexes: readonly IndexDescriptor[],
): void => {
	const colDefs = [`${quoteId("id")} TEXT PRIMARY KEY`];
	for (const col of columns) {
		let def = `${quoteId(col.columnName)} ${col.sqlType}`;
		if (!col.nullable) def += " NOT NULL";
		if (col.check) def += ` CHECK(${col.check})`;
		colDefs.push(def);
	}

	database.run(
		`CREATE TABLE ${quoteId(tableName)} (${colDefs.join(", ")}) STRICT`,
	);

	for (const index of indexes) {
		const colName = toSnakeCase(index.field);
		const indexName = `idx_${tableName}_${colName}`;
		const unique = index.kind === "unique" ? "UNIQUE " : "";
		database.run(
			`CREATE ${unique}INDEX ${quoteId(indexName)} ON ${quoteId(tableName)}(${quoteId(colName)})`,
		);
	}
};

const sqlDefault = (sqlType: string): string => {
	switch (sqlType) {
		case "INTEGER":
		case "REAL": {
			return "0";
		}
		case "TEXT": {
			return "''";
		}
		default: {
			return "''";
		}
	}
};

const reconcileMainTable = (
	database: Database,
	tableName: string,
	columns: readonly ColumnDescriptor[],
	indexes: readonly IndexDescriptor[],
	warnings: string[],
): void => {
	const existing = database
		.query<ExistingColumn, []>(`PRAGMA table_info(${quoteId(tableName)})`)
		.all();
	const existingNames = new Set(existing.map((c) => c.name));

	for (const col of columns) {
		if (!existingNames.has(col.columnName)) {
			let def = `${quoteId(col.columnName)} ${col.sqlType}`;
			if (!col.nullable) def += ` NOT NULL DEFAULT ${sqlDefault(col.sqlType)}`;
			if (col.check) def += ` CHECK(${col.check})`;
			database.run(`ALTER TABLE ${quoteId(tableName)} ADD COLUMN ${def}`);
		}
	}

	const wantedNames = new Set(["id", ...columns.map((c) => c.columnName)]);
	for (const ec of existing) {
		if (!wantedNames.has(ec.name)) {
			warnings.push(
				`Column "${ec.name}" in table "${tableName}" is not in schema — skipping removal`,
			);
		}
	}

	const existingIndexes = database
		.query<
			ExistingIndex,
			[string]
		>("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name=? AND name NOT LIKE 'sqlite_%'")
		.all(tableName);
	const existingIndexNames = new Set(
		existingIndexes.map((index) => index.name),
	);
	const wantedIndexNames = new Set(
		indexes.map((index) => `idx_${tableName}_${toSnakeCase(index.field)}`),
	);

	for (const index of indexes) {
		const colName = toSnakeCase(index.field);
		const indexName = `idx_${tableName}_${colName}`;
		if (!existingIndexNames.has(indexName)) {
			const unique = index.kind === "unique" ? "UNIQUE " : "";
			database.run(
				`CREATE ${unique}INDEX ${quoteId(indexName)} ON ${quoteId(tableName)}(${quoteId(colName)})`,
			);
		}
	}

	for (const ei of existingIndexes) {
		if (!wantedIndexNames.has(ei.name)) {
			database.run(`DROP INDEX ${quoteId(ei.name)}`);
		}
	}
};

const createChildTable = (
	database: Database,
	ct: ChildTableDescriptor,
): void => {
	const colDefs = [
		`${quoteId(PARENT_ID_COL)} TEXT NOT NULL REFERENCES ${quoteId(ct.parentTable)}(${quoteId("id")}) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED`,
	];

	for (const col of ct.columns) {
		let def = `${quoteId(col.columnName)} ${col.sqlType}`;
		if (!col.nullable) def += " NOT NULL";
		if (col.check) def += ` CHECK(${col.check})`;
		colDefs.push(def);
	}

	database.run(
		`CREATE TABLE ${quoteId(ct.childTable)} (${colDefs.join(", ")}) STRICT`,
	);
	const indexName = `idx_${ct.childTable}_${PARENT_ID_COL}`;
	database.run(
		`CREATE INDEX ${quoteId(indexName)} ON ${quoteId(ct.childTable)}(${quoteId(PARENT_ID_COL)})`,
	);
};

// =============================================================================
// JSON ↔ Row Conversion
// =============================================================================

const jsonToColumns = (
	data: Record<string, unknown>,
	fields: readonly FieldSpec[],
	prefix?: string,
): Record<string, unknown> => {
	const row: Record<string, unknown> = {};

	for (const field of fields) {
		const colPrefix = toColumnName(prefix, field.name);
		const value = data[field.name];

		if (value === undefined || value === null) {
			setNullColumns(row, field.type, colPrefix);
			continue;
		}

		switch (field.type.kind) {
			case "array": {
				break;
			}
			case "boolean": {
				row[colPrefix] = (value as boolean) ? 1 : 0;
				break;
			}
			case "date": {
				row[colPrefix] = (value as Date).toISOString().slice(0, 10);
				break;
			}
			case "datetime": {
				row[colPrefix] = (value as Date).toISOString();
				break;
			}
			case "discriminated": {
				const disc = (value as Record<string, unknown>)[
					field.type.discriminator
				] as string;
				row[toColumnName(colPrefix, field.type.discriminator)] = disc;
				for (const [variantName, variantFields] of Object.entries(
					field.type.variants,
				)) {
					const variantPrefix = `${colPrefix}__${toSnakeCase(variantName)}`;
					if (variantName === disc) {
						Object.assign(
							row,
							jsonToColumns(
								value as Record<string, unknown>,
								variantFields,
								variantPrefix,
							),
						);
					} else {
						for (const vf of variantFields) {
							setNullColumns(
								row,
								vf.type,
								toColumnName(variantPrefix, vf.name),
							);
						}
					}
				}
				break;
			}
			case "float": {
				row[colPrefix] = value;
				break;
			}
			case "id":
			case "string":
			case "union": {
				row[colPrefix] = value;
				break;
			}
			case "integer": {
				row[colPrefix] = Number(value);
				break;
			}
			case "json": {
				row[colPrefix] = JSON.stringify(value);
				break;
			}
			case "object": {
				Object.assign(
					row,
					jsonToColumns(
						value as Record<string, unknown>,
						field.type.fields,
						colPrefix,
					),
				);
				break;
			}
		}
	}

	return row;
};

const setNullColumns = (
	row: Record<string, unknown>,
	type: FieldType,
	prefix: string,
): void => {
	switch (type.kind) {
		case "array":
		case "boolean":
		case "date":
		case "datetime":
		case "float":
		case "id":
		case "integer":
		case "json":
		case "string":
		case "union": {
			// Don't set the key — the SQL boundary converts undefined to NULL
			break;
		}
		case "discriminated": {
			// Don't set the key — the SQL boundary converts undefined to NULL
			for (const [variantName, variantFields] of Object.entries(
				type.variants,
			)) {
				const vPrefix = `${prefix}__${toSnakeCase(variantName)}`;
				for (const vf of variantFields) {
					setNullColumns(row, vf.type, toColumnName(vPrefix, vf.name));
				}
			}
			break;
		}
		case "object": {
			for (const f of type.fields) {
				setNullColumns(row, f.type, toColumnName(prefix, f.name));
			}
			break;
		}
	}
};

const columnsToJson = (
	row: Record<string, unknown>,
	fields: readonly FieldSpec[],
	prefix?: string,
): Record<string, unknown> => {
	const result: Record<string, unknown> = {};

	for (const field of fields) {
		const colPrefix = toColumnName(prefix, field.name);

		switch (field.type.kind) {
			case "array": {
				break;
			}
			case "boolean": {
				if (row[colPrefix] !== null && row[colPrefix] !== undefined) {
					result[field.name] = row[colPrefix] === 1;
				}
				break;
			}
			case "date": {
				if (row[colPrefix] !== null && row[colPrefix] !== undefined) {
					result[field.name] = new Date(row[colPrefix] as string);
				}
				break;
			}
			case "datetime": {
				if (row[colPrefix] !== null && row[colPrefix] !== undefined) {
					result[field.name] = new Date(row[colPrefix] as string);
				}
				break;
			}
			case "discriminated": {
				const disc = row[toColumnName(colPrefix, field.type.discriminator)] as
					| string
					| undefined;
				if (disc !== undefined) {
					const variant: Record<string, unknown> = {
						[field.type.discriminator]: disc,
					};
					const variantFields = field.type.variants[disc];
					if (variantFields) {
						Object.assign(
							variant,
							columnsToJson(
								row,
								variantFields,
								`${colPrefix}__${toSnakeCase(disc)}`,
							),
						);
					}
					result[field.name] = variant;
				}
				break;
			}
			case "float": {
				if (row[colPrefix] !== null && row[colPrefix] !== undefined) {
					result[field.name] = row[colPrefix];
				}
				break;
			}
			case "id":
			case "string":
			case "union": {
				if (row[colPrefix] !== null && row[colPrefix] !== undefined) {
					result[field.name] = row[colPrefix];
				}
				break;
			}
			case "integer": {
				if (row[colPrefix] !== null && row[colPrefix] !== undefined) {
					result[field.name] = BigInt(row[colPrefix] as number);
				}
				break;
			}
			case "json": {
				if (row[colPrefix] !== null && row[colPrefix] !== undefined) {
					result[field.name] = JSON.parse(row[colPrefix] as string);
				}
				break;
			}
			case "object": {
				const object = columnsToJson(row, field.type.fields, colPrefix);
				if (Object.keys(object).length > 0) {
					result[field.name] = object;
				}
				break;
			}
		}
	}

	return result;
};

// =============================================================================
// Child Table Operations
// =============================================================================

const extractArrayFields = (
	fields: readonly FieldSpec[],
): { arrayType: FieldType & { kind: "array" }; fieldName: string }[] => {
	const result: {
		arrayType: FieldType & { kind: "array" };
		fieldName: string;
	}[] = [];
	for (const field of fields) {
		if (field.type.kind === "array") {
			result.push({
				fieldName: field.name,
				arrayType: field.type,
			});
		}
	}
	return result;
};

interface ChildTableOps {
	readonly fieldName: string;
	readonly childTable: string;
	readonly getChildren: (parentId: string) => unknown[];
	readonly getAllChildren: (
		parentIds: readonly string[],
	) => Map<string, unknown[]>;
	readonly deleteChildren: (parentId: string) => void;
	readonly insertChild: (parentId: string, value: unknown) => void;
}

const createChildTableOps = (
	database: Database,
	arrayFields: {
		arrayType: FieldType & { kind: "array" };
		fieldName: string;
	}[],
): ChildTableOps[] =>
	arrayFields.map(({ fieldName, arrayType }) => {
		const childTable = arrayType.childTable;
		const elementColumns = flattenArrayElement(arrayType.element);
		const colNames = elementColumns.map((c) => c.columnName);

		const quotedCols = colNames.map(quoteId).join(", ");
		const selectStmt = database.query<Record<string, unknown>, [string]>(
			`SELECT ${quotedCols} FROM ${quoteId(childTable)} WHERE ${quoteId(PARENT_ID_COL)} = ? ORDER BY rowid`,
		);
		const deleteStmt = database.query(
			`DELETE FROM ${quoteId(childTable)} WHERE ${quoteId(PARENT_ID_COL)} = ?`,
		);
		const placeholders = colNames.map(() => "?").join(", ");
		const insertSql = `INSERT INTO ${quoteId(childTable)} (${quoteId(PARENT_ID_COL)}, ${quotedCols}) VALUES (?, ${placeholders})`;

		return {
			fieldName,
			childTable,
			getChildren: (parentId: string) => {
				const rows = selectStmt.all(parentId);
				return rows.map((row) => childRowToValue(row, arrayType.element));
			},
			getAllChildren: (parentIds: readonly string[]) => {
				const result = new Map<string, unknown[]>();
				if (parentIds.length === 0) return result;
				const placeholders = parentIds.map(() => "?").join(", ");
				const rows = database
					.query<
						Record<string, unknown>,
						string[]
					>(`SELECT ${quoteId(PARENT_ID_COL)}, ${quotedCols} FROM ${quoteId(childTable)} WHERE ${quoteId(PARENT_ID_COL)} IN (${placeholders}) ORDER BY rowid`)
					.all(...(parentIds as string[]));
				for (const row of rows) {
					const pid = row[PARENT_ID_COL] as string;
					const array = result.get(pid) ?? [];
					array.push(childRowToValue(row, arrayType.element));
					result.set(pid, array);
				}
				return result;
			},
			deleteChildren: (parentId: string) => {
				deleteStmt.run(parentId);
			},
			insertChild: (parentId: string, value: unknown) => {
				const vals = childValueToRow(value, arrayType.element);
				// bun:sqlite types don't include null but SQLite accepts it for nullable columns
				database.run(insertSql, [parentId, ...vals] as unknown as string[]);
			},
		};
	});

const childRowToValue = (
	row: Record<string, unknown>,
	element: FieldType,
): unknown => {
	switch (element.kind) {
		case "array": {
			return JSON.parse(row["value"] as string);
		}
		case "boolean": {
			return row["value"] === 1;
		}
		case "date": {
			return new Date(row["value"] as string);
		}
		case "datetime": {
			return new Date(row["value"] as string);
		}
		case "discriminated": {
			const disc = row[toSnakeCase(element.discriminator)] as string;
			const variant: Record<string, unknown> = {
				[element.discriminator]: disc,
			};
			const variantFields = element.variants[disc];
			if (variantFields) {
				Object.assign(
					variant,
					columnsToJson(row, variantFields, toSnakeCase(disc)),
				);
			}
			return variant;
		}
		case "float":
		case "id":
		case "string":
		case "union": {
			return row["value"];
		}
		case "integer": {
			return BigInt(row["value"] as number);
		}
		case "json": {
			return JSON.parse(row["value"] as string);
		}
		case "object": {
			return columnsToJson(row, element.fields);
		}
	}
};

const childValueToRow = (value: unknown, element: FieldType): unknown[] => {
	switch (element.kind) {
		case "array": {
			return [JSON.stringify(value)];
		}
		case "boolean": {
			return [value ? 1 : 0];
		}
		case "date": {
			return [(value as Date).toISOString().slice(0, 10)];
		}
		case "datetime": {
			return [(value as Date).toISOString()];
		}
		case "discriminated": {
			const disc = (value as Record<string, unknown>)[
				element.discriminator
			] as string;
			const cols: unknown[] = [disc];
			for (const [variantName, variantFields] of Object.entries(
				element.variants,
			)) {
				if (variantName === disc) {
					const snakedVariant = toSnakeCase(variantName);
					const mapped = jsonToColumns(
						value as Record<string, unknown>,
						variantFields,
						snakedVariant,
					);
					for (const vf of variantFields) {
						cols.push(mapped[toColumnName(snakedVariant, vf.name)] ?? SQL_NULL);
					}
				} else {
					for (const _vf of variantFields) {
						cols.push(SQL_NULL);
					}
				}
			}
			return cols;
		}
		case "float":
		case "id":
		case "string":
		case "union": {
			return [value];
		}
		case "integer": {
			return [Number(value)];
		}
		case "json": {
			return [JSON.stringify(value)];
		}
		case "object": {
			const cols = jsonToColumns(
				value as Record<string, unknown>,
				element.fields,
			);
			return flattenArrayElement(element).map(
				(c) => cols[c.columnName] ?? SQL_NULL,
			);
		}
	}
};

// =============================================================================
// createRelationalSqliteStore
// =============================================================================

const createRelationalSqliteStore = (
	database: Database,
	config: RelationalTableConfig,
): EntityStore => {
	database.run("PRAGMA foreign_keys = ON");
	database.run("PRAGMA journal_mode = WAL");
	const warnings = reconcileSchema(database, config);
	for (const w of warnings) {
		Effect.runSync(Effect.logWarning(w));
	}

	const { columns } = flattenFields(config.fields, config.tableName);
	const arrayFields = extractArrayFields(config.fields);
	const childOps = createChildTableOps(database, arrayFields);
	const colNames = columns.map((c) => c.columnName);

	const quotedTable = quoteId(config.tableName);
	const quotedCols = colNames.map(quoteId).join(", ");
	const selectById = database.query<Record<string, unknown>, [string]>(
		`SELECT ${quoteId("id")}, ${quotedCols} FROM ${quotedTable} WHERE ${quoteId("id")} = ?`,
	);
	const selectAll = database.query<Record<string, unknown>, []>(
		`SELECT ${quoteId("id")}, ${quotedCols} FROM ${quotedTable}`,
	);
	const deleteById = database.query(
		`DELETE FROM ${quotedTable} WHERE ${quoteId("id")} = ?`,
	);

	const upsertSql = buildUpsertSql(config.tableName, colNames);

	const rowToJson = (
		row: Record<string, unknown>,
		childData: Record<string, unknown[]>,
	): string => {
		const object = columnsToJson(row, config.fields);
		object["id"] = row["id"];
		for (const cop of childOps) {
			object[cop.fieldName] = childData[cop.fieldName] ?? [];
		}
		return jsonStringify(object);
	};

	const findByUniqueIndex = (
		field: string,
	): Statement<Record<string, unknown>, [string]> =>
		database.query<Record<string, unknown>, [string]>(
			`SELECT ${quoteId("id")}, ${quotedCols} FROM ${quotedTable} WHERE ${quoteId(field)} = ? LIMIT 1`,
		);

	const findByNonUniqueIndex = (
		field: string,
	): Statement<Record<string, unknown>, [string]> =>
		database.query<Record<string, unknown>, [string]>(
			`SELECT ${quoteId("id")}, ${quotedCols} FROM ${quotedTable} WHERE ${quoteId(field)} = ?`,
		);

	const uniqueFields = new Set(
		config.indexes
			.filter((index) => index.kind === "unique")
			.map((index) => index.field),
	);

	const indexStatements = new Map<
		string,
		Statement<Record<string, unknown>, [string]>
	>();
	for (const index of config.indexes) {
		const colName = toSnakeCase(index.field);
		const stmt =
			index.kind === "unique"
				? findByUniqueIndex(colName)
				: findByNonUniqueIndex(colName);
		indexStatements.set(index.field, stmt);
	}

	const getChildData = (id: string): Record<string, unknown[]> => {
		const data: Record<string, unknown[]> = {};
		for (const cop of childOps) {
			data[cop.fieldName] = cop.getChildren(id);
		}
		return data;
	};

	const getBatchChildData = (
		ids: readonly string[],
	): Map<string, Record<string, unknown[]>> => {
		const result = new Map<string, Record<string, unknown[]>>();
		if (childOps.length === 0) return result;
		const perField = childOps.map((cop) => ({
			fieldName: cop.fieldName,
			byParent: cop.getAllChildren(ids),
		}));
		for (const id of ids) {
			const data: Record<string, unknown[]> = {};
			for (const pf of perField) {
				data[pf.fieldName] = pf.byParent.get(id) ?? [];
			}
			result.set(id, data);
		}
		return result;
	};

	return {
		get: (id) =>
			Effect.try({
				try: () => {
					const row = selectById.get(id);
					if (!row) return undefined;
					return rowToJson(row, getChildData(id));
				},
				catch: (error) =>
					new StorageOperationError({
						message: `Relational SQLite get failed: ${String(error)}`,
					}),
			}),

		getAll: (pagination?: PaginationParams) =>
			Effect.try({
				try: () => {
					const rows = selectAll.all();
					const ids = rows.map((r) => r["id"] as string);
					const batchChild = getBatchChildData(ids);
					const all = rows.map((row) => {
						const id = row["id"] as string;
						return rowToJson(row, batchChild.get(id) ?? getChildData(id));
					});
					return applyPagination(all, pagination);
				},
				catch: (error) =>
					new StorageOperationError({
						message: `Relational SQLite getAll failed: ${String(error)}`,
					}),
			}),

		put: (id, data) =>
			Effect.try({
				try: () => {
					const parsed = jsonParse(data) as Record<string, unknown>;
					const colValues = jsonToColumns(parsed, config.fields);

					database.transaction(() => {
						// bun:sqlite types don't include null but SQLite accepts it for nullable columns
						const values = [
							id,
							...colNames.map((c) => colValues[c] ?? SQL_NULL),
						] as unknown as string[];
						database.run(upsertSql, values);

						for (const cop of childOps) {
							cop.deleteChildren(id);
							const array = parsed[cop.fieldName] as unknown[] | undefined;
							if (array) {
								for (const item of array) {
									cop.insertChild(id, item);
								}
							}
						}
					})();
				},
				catch: (error) =>
					new StorageOperationError({
						message: `Relational SQLite put failed: ${String(error)}`,
					}),
			}),

		remove: (id) =>
			Effect.try({
				try: () => {
					deleteById.run(id);
				},
				catch: (error) =>
					new StorageOperationError({
						message: `Relational SQLite remove failed: ${String(error)}`,
					}),
			}),

		findByIndex: (field, value) =>
			Effect.try({
				try: () => {
					const stmt = indexStatements.get(field);
					if (!stmt) {
						throw new Error(
							`No index on field "${field}" for table "${config.tableName}"`,
						);
					}
					if (uniqueFields.has(field)) {
						const row = stmt.get(value);
						if (!row) return undefined;
						return rowToJson(row, getChildData(row["id"] as string));
					}
					const rows = stmt.all(value);
					const row = rows[0];
					if (!row) return undefined;
					return rowToJson(row, getChildData(row["id"] as string));
				},
				catch: (error) =>
					new StorageOperationError({
						message: `Relational SQLite findByIndex failed: ${String(error)}`,
					}),
			}),

		findAllByIndex: (field, value, pagination?: PaginationParams) =>
			Effect.try({
				try: () => {
					const stmt = indexStatements.get(field);
					if (!stmt) {
						throw new Error(
							`No index on field "${field}" for table "${config.tableName}"`,
						);
					}
					const rows = stmt.all(value);
					const ids = rows.map((r) => r["id"] as string);
					const batchChild = getBatchChildData(ids);
					const all = rows.map((row) => {
						const id = row["id"] as string;
						return rowToJson(row, batchChild.get(id) ?? getChildData(id));
					});
					return applyPagination(all, pagination);
				},
				catch: (error) =>
					new StorageOperationError({
						message: `Relational SQLite findAllByIndex failed: ${String(error)}`,
					}),
			}),
	};
};

const buildUpsertSql = (
	tableName: string,
	colNames: readonly string[],
): string => {
	const allCols = ["id", ...colNames];
	const quotedAllCols = allCols.map(quoteId).join(", ");
	const placeholders = allCols.map(() => "?").join(", ");
	const updateSet = colNames
		.map((c) => `${quoteId(c)} = excluded.${quoteId(c)}`)
		.join(", ");
	return `INSERT INTO ${quoteId(tableName)} (${quotedAllCols}) VALUES (${placeholders}) ON CONFLICT(${quoteId("id")}) DO UPDATE SET ${updateSet}`;
};

export { createRelationalSqliteStore, reconcileSchema };

export {
	type FieldSpec,
	type FieldType,
	flattenFields,
} from "./field-flattening";
