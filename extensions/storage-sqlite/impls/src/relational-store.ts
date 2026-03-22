import type { Database, Statement } from "bun:sqlite";
import { Effect } from "effect";
import { jsonParse, jsonStringify } from "@morph/utils";

import type {
	EntityStore,
	IndexDescriptor,
	PaginationParams,
} from "@morph/storage-dsl";

import { StorageOperationError, applyPagination } from "@morph/storage-dsl";

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

export type { FieldSpec, FieldType, RelationalTableConfig };

const PARENT_ID_COL = "parent_id";

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
	db: Database,
	config: RelationalTableConfig,
): readonly string[] => {
	const { columns, childTables } = flattenFields(
		config.fields,
		config.tableName,
	);

	const warnings: string[] = [];

	db.transaction(() => {
		const tableExists =
			db
				.query<
					{ cnt: number },
					[string]
				>("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name=?")
				.get(config.tableName)?.cnt ?? 0;

		if (tableExists === 0) {
			createMainTable(db, config.tableName, columns, config.indexes);
		} else {
			reconcileMainTable(
				db,
				config.tableName,
				columns,
				config.indexes,
				warnings,
			);
		}

		for (const ct of childTables) {
			const ctExists =
				db
					.query<
						{ cnt: number },
						[string]
					>("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name=?")
					.get(ct.childTable)?.cnt ?? 0;

			if (ctExists === 0) {
				createChildTable(db, ct);
			}
		}
	})();

	return warnings;
};

const createMainTable = (
	db: Database,
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

	db.run(`CREATE TABLE ${quoteId(tableName)} (${colDefs.join(", ")}) STRICT`);

	for (const idx of indexes) {
		const colName = toSnakeCase(idx.field);
		const idxName = `idx_${tableName}_${colName}`;
		const unique = idx.kind === "unique" ? "UNIQUE " : "";
		db.run(
			`CREATE ${unique}INDEX ${quoteId(idxName)} ON ${quoteId(tableName)}(${quoteId(colName)})`,
		);
	}
};

const sqlDefault = (sqlType: string): string => {
	switch (sqlType) {
		case "TEXT":
			return "''";
		case "INTEGER":
		case "REAL":
			return "0";
		default:
			return "''";
	}
};

const reconcileMainTable = (
	db: Database,
	tableName: string,
	columns: readonly ColumnDescriptor[],
	indexes: readonly IndexDescriptor[],
	warnings: string[],
): void => {
	const existing = db
		.query<ExistingColumn, []>(`PRAGMA table_info(${quoteId(tableName)})`)
		.all();
	const existingNames = new Set(existing.map((c) => c.name));

	for (const col of columns) {
		if (!existingNames.has(col.columnName)) {
			let def = `${quoteId(col.columnName)} ${col.sqlType}`;
			if (!col.nullable) def += ` NOT NULL DEFAULT ${sqlDefault(col.sqlType)}`;
			if (col.check) def += ` CHECK(${col.check})`;
			db.run(`ALTER TABLE ${quoteId(tableName)} ADD COLUMN ${def}`);
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

	const existingIndexes = db
		.query<
			ExistingIndex,
			[string]
		>("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name=? AND name NOT LIKE 'sqlite_%'")
		.all(tableName);
	const existingIndexNames = new Set(existingIndexes.map((i) => i.name));
	const wantedIndexNames = new Set(
		indexes.map((idx) => `idx_${tableName}_${toSnakeCase(idx.field)}`),
	);

	for (const idx of indexes) {
		const colName = toSnakeCase(idx.field);
		const idxName = `idx_${tableName}_${colName}`;
		if (!existingIndexNames.has(idxName)) {
			const unique = idx.kind === "unique" ? "UNIQUE " : "";
			db.run(
				`CREATE ${unique}INDEX ${quoteId(idxName)} ON ${quoteId(tableName)}(${quoteId(colName)})`,
			);
		}
	}

	for (const ei of existingIndexes) {
		if (!wantedIndexNames.has(ei.name)) {
			db.run(`DROP INDEX ${quoteId(ei.name)}`);
		}
	}
};

const createChildTable = (db: Database, ct: ChildTableDescriptor): void => {
	const colDefs = [
		`${quoteId(PARENT_ID_COL)} TEXT NOT NULL REFERENCES ${quoteId(ct.parentTable)}(${quoteId("id")}) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED`,
	];

	for (const col of ct.columns) {
		let def = `${quoteId(col.columnName)} ${col.sqlType}`;
		if (!col.nullable) def += " NOT NULL";
		if (col.check) def += ` CHECK(${col.check})`;
		colDefs.push(def);
	}

	db.run(
		`CREATE TABLE ${quoteId(ct.childTable)} (${colDefs.join(", ")}) STRICT`,
	);
	const idxName = `idx_${ct.childTable}_${PARENT_ID_COL}`;
	db.run(
		`CREATE INDEX ${quoteId(idxName)} ON ${quoteId(ct.childTable)}(${quoteId(PARENT_ID_COL)})`,
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
			case "string":
			case "id":
			case "union":
				row[colPrefix] = value;
				break;
			case "date":
				row[colPrefix] = (value as Date).toISOString().slice(0, 10);
				break;
			case "float":
				row[colPrefix] = value;
				break;
			case "integer":
				row[colPrefix] = Number(value);
				break;
			case "datetime":
				row[colPrefix] = (value as Date).toISOString();
				break;
			case "boolean":
				row[colPrefix] = value ? 1 : 0;
				break;
			case "json":
				row[colPrefix] = JSON.stringify(value);
				break;
			case "object":
				Object.assign(
					row,
					jsonToColumns(
						value as Record<string, unknown>,
						field.type.fields,
						colPrefix,
					),
				);
				break;
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
			case "array":
				break;
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
		case "string":
		case "float":
		case "integer":
		case "date":
		case "datetime":
		case "boolean":
		case "id":
		case "union":
		case "json":
		case "array":
			row[prefix] = null;
			break;
		case "object":
			for (const f of type.fields) {
				setNullColumns(row, f.type, toColumnName(prefix, f.name));
			}
			break;
		case "discriminated":
			row[toColumnName(prefix, type.discriminator)] = null;
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
			case "string":
			case "id":
			case "union":
				if (row[colPrefix] !== null && row[colPrefix] !== undefined) {
					result[field.name] = row[colPrefix];
				}
				break;
			case "date":
				if (row[colPrefix] !== null && row[colPrefix] !== undefined) {
					result[field.name] = new Date(row[colPrefix] as string);
				}
				break;
			case "float":
				if (row[colPrefix] !== null && row[colPrefix] !== undefined) {
					result[field.name] = row[colPrefix];
				}
				break;
			case "integer":
				if (row[colPrefix] !== null && row[colPrefix] !== undefined) {
					result[field.name] = BigInt(row[colPrefix] as number);
				}
				break;
			case "datetime":
				if (row[colPrefix] !== null && row[colPrefix] !== undefined) {
					result[field.name] = new Date(row[colPrefix] as string);
				}
				break;
			case "boolean":
				if (row[colPrefix] !== null && row[colPrefix] !== undefined) {
					result[field.name] = row[colPrefix] === 1;
				}
				break;
			case "json":
				if (row[colPrefix] !== null && row[colPrefix] !== undefined) {
					result[field.name] = JSON.parse(row[colPrefix] as string);
				}
				break;
			case "object": {
				const obj = columnsToJson(row, field.type.fields, colPrefix);
				if (Object.keys(obj).length > 0) {
					result[field.name] = obj;
				}
				break;
			}
			case "discriminated": {
				const disc = row[toColumnName(colPrefix, field.type.discriminator)] as
					| string
					| null;
				if (disc !== null && disc !== undefined) {
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
			case "array":
				break;
		}
	}

	return result;
};

// =============================================================================
// Child Table Operations
// =============================================================================

const extractArrayFields = (
	fields: readonly FieldSpec[],
): Array<{ fieldName: string; arrayType: FieldType & { kind: "array" } }> => {
	const result: Array<{
		fieldName: string;
		arrayType: FieldType & { kind: "array" };
	}> = [];
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
	db: Database,
	arrayFields: Array<{
		fieldName: string;
		arrayType: FieldType & { kind: "array" };
	}>,
): ChildTableOps[] =>
	arrayFields.map(({ fieldName, arrayType }) => {
		const childTable = arrayType.childTable;
		const elementColumns = flattenArrayElement(arrayType.element);
		const colNames = elementColumns.map((c) => c.columnName);

		const quotedCols = colNames.map(quoteId).join(", ");
		const selectStmt = db.query<Record<string, unknown>, [string]>(
			`SELECT ${quotedCols} FROM ${quoteId(childTable)} WHERE ${quoteId(PARENT_ID_COL)} = ? ORDER BY rowid`,
		);
		const deleteStmt = db.query(
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
				const rows = db
					.query<
						Record<string, unknown>,
						string[]
					>(`SELECT ${quoteId(PARENT_ID_COL)}, ${quotedCols} FROM ${quoteId(childTable)} WHERE ${quoteId(PARENT_ID_COL)} IN (${placeholders}) ORDER BY rowid`)
					.all(...(parentIds as string[]));
				for (const row of rows) {
					const pid = row[PARENT_ID_COL] as string;
					const arr = result.get(pid) ?? [];
					arr.push(childRowToValue(row, arrayType.element));
					result.set(pid, arr);
				}
				return result;
			},
			deleteChildren: (parentId: string) => {
				deleteStmt.run(parentId);
			},
			insertChild: (parentId: string, value: unknown) => {
				const vals = childValueToRow(value, arrayType.element);
				// bun:sqlite types don't include null but SQLite accepts it for nullable columns
				db.run(insertSql, [parentId, ...vals] as unknown as string[]);
			},
		};
	});

const childRowToValue = (
	row: Record<string, unknown>,
	element: FieldType,
): unknown => {
	switch (element.kind) {
		case "string":
		case "id":
		case "union":
		case "float":
			return row["value"];
		case "date":
			return new Date(row["value"] as string);
		case "integer":
			return BigInt(row["value"] as number);
		case "datetime":
			return new Date(row["value"] as string);
		case "boolean":
			return row["value"] === 1;
		case "json":
			return JSON.parse(row["value"] as string);
		case "object":
			return columnsToJson(row, element.fields);
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
		case "array":
			return JSON.parse(row["value"] as string);
	}
};

const childValueToRow = (value: unknown, element: FieldType): unknown[] => {
	switch (element.kind) {
		case "string":
		case "id":
		case "union":
		case "float":
			return [value];
		case "date":
			return [(value as Date).toISOString().slice(0, 10)];
		case "integer":
			return [Number(value)];
		case "datetime":
			return [(value as Date).toISOString()];
		case "boolean":
			return [value ? 1 : 0];
		case "json":
			return [JSON.stringify(value)];
		case "object": {
			const cols = jsonToColumns(
				value as Record<string, unknown>,
				element.fields,
			);
			return flattenArrayElement(element).map(
				(c) => cols[c.columnName] ?? null,
			);
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
						cols.push(mapped[toColumnName(snakedVariant, vf.name)] ?? null);
					}
				} else {
					for (const _vf of variantFields) {
						cols.push(null);
					}
				}
			}
			return cols;
		}
		case "array":
			return [JSON.stringify(value)];
	}
};

// =============================================================================
// createRelationalSqliteStore
// =============================================================================

const createRelationalSqliteStore = (
	db: Database,
	config: RelationalTableConfig,
): EntityStore => {
	db.run("PRAGMA foreign_keys = ON");
	db.run("PRAGMA journal_mode = WAL");
	const warnings = reconcileSchema(db, config);
	for (const w of warnings) {
		Effect.runSync(Effect.logWarning(w));
	}

	const { columns } = flattenFields(config.fields, config.tableName);
	const arrayFields = extractArrayFields(config.fields);
	const childOps = createChildTableOps(db, arrayFields);
	const colNames = columns.map((c) => c.columnName);

	const quotedTable = quoteId(config.tableName);
	const quotedCols = colNames.map(quoteId).join(", ");
	const selectById = db.query<Record<string, unknown>, [string]>(
		`SELECT ${quoteId("id")}, ${quotedCols} FROM ${quotedTable} WHERE ${quoteId("id")} = ?`,
	);
	const selectAll = db.query<Record<string, unknown>, []>(
		`SELECT ${quoteId("id")}, ${quotedCols} FROM ${quotedTable}`,
	);
	const deleteById = db.query(
		`DELETE FROM ${quotedTable} WHERE ${quoteId("id")} = ?`,
	);

	const upsertSql = buildUpsertSql(config.tableName, colNames);

	const rowToJson = (
		row: Record<string, unknown>,
		childData: Record<string, unknown[]>,
	): string => {
		const obj = columnsToJson(row, config.fields);
		obj["id"] = row["id"];
		for (const cop of childOps) {
			obj[cop.fieldName] = childData[cop.fieldName] ?? [];
		}
		return jsonStringify(obj);
	};

	const findByUniqueIndex = (
		field: string,
	): Statement<Record<string, unknown>, [string]> =>
		db.query<Record<string, unknown>, [string]>(
			`SELECT ${quoteId("id")}, ${quotedCols} FROM ${quotedTable} WHERE ${quoteId(field)} = ? LIMIT 1`,
		);

	const findByNonUniqueIndex = (
		field: string,
	): Statement<Record<string, unknown>, [string]> =>
		db.query<Record<string, unknown>, [string]>(
			`SELECT ${quoteId("id")}, ${quotedCols} FROM ${quotedTable} WHERE ${quoteId(field)} = ?`,
		);

	const uniqueFields = new Set(
		config.indexes
			.filter((idx) => idx.kind === "unique")
			.map((idx) => idx.field),
	);

	const indexStatements = new Map<
		string,
		Statement<Record<string, unknown>, [string]>
	>();
	for (const idx of config.indexes) {
		const colName = toSnakeCase(idx.field);
		const stmt =
			idx.kind === "unique"
				? findByUniqueIndex(colName)
				: findByNonUniqueIndex(colName);
		indexStatements.set(idx.field, stmt);
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

		getAll: (pagination?: PaginationParams | undefined) =>
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

					db.transaction(() => {
						// bun:sqlite types don't include null but SQLite accepts it for nullable columns
						const values = [
							id,
							...colNames.map((c) => colValues[c] ?? null),
						] as unknown as string[];
						db.run(upsertSql, values);

						for (const cop of childOps) {
							cop.deleteChildren(id);
							const arr = parsed[cop.fieldName] as unknown[] | undefined;
							if (arr) {
								for (const item of arr) {
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
					if (rows.length === 0) return undefined;
					const row = rows[0]!;
					return rowToJson(row, getChildData(row["id"] as string));
				},
				catch: (error) =>
					new StorageOperationError({
						message: `Relational SQLite findByIndex failed: ${String(error)}`,
					}),
			}),

		findAllByIndex: (field, value, pagination?: PaginationParams | undefined) =>
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

export { createRelationalSqliteStore, flattenFields, reconcileSchema };
