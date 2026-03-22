/**
 * Entity page generation - list, create, detail, edit templates.
 */
import type {
	DomainSchema,
	EntityDef,
	QualifiedEntry,
} from "@morph/domain-schema";

import { getAllCommands, getAllOperations } from "@morph/domain-schema";

import { buildEntityContext } from "./context";
import {
	generateCreatePage,
	generateDetailPage,
	generateEditPage,
	generateListPage,
} from "./templates";

/**
 * Generate pages for all entities with @ui operations.
 */
export const generateEntityPages = (
	schema: DomainSchema,
	entities: readonly QualifiedEntry<EntityDef>[],
	sseOptions: string,
): readonly string[] => {
	const ops = getAllOperations(schema).filter((op) =>
		op.def.tags.includes("@ui"),
	);
	const commands = getAllCommands(schema);
	const pages: string[] = [];

	for (const entity of entities) {
		const entityOps = ops.filter((op) =>
			op.name.toLowerCase().includes(entity.name.toLowerCase()),
		);

		if (entityOps.length === 0) continue;

		const context = buildEntityContext(entity, commands, schema);

		const listOp = entityOps.find(
			(op) => op.name.startsWith("list") || op.name.startsWith("getAll"),
		);
		if (listOp) {
			pages.push(generateListPage(context, sseOptions));
		}

		const createOp = entityOps.find(
			(op) => op.name.startsWith("create") || op.name.startsWith("add"),
		);
		if (createOp) {
			pages.push(generateCreatePage(context, createOp, schema, sseOptions));
		}

		const updateOp = entityOps.find(
			(op) => op.name.startsWith("update") || op.name.startsWith("edit"),
		);

		const getOp = entityOps.find(
			(op) =>
				(op.name.startsWith("get") && !op.name.startsWith("getAll")) ||
				op.name.startsWith("find"),
		);
		if (getOp) {
			pages.push(generateDetailPage(context, !!updateOp, sseOptions));
		}

		if (updateOp) {
			pages.push(generateEditPage(context, updateOp, schema, sseOptions));
		}
	}

	return pages;
};
