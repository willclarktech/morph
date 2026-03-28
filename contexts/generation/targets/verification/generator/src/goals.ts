import type { DomainSchema, GeneratedFile } from "@morph/domain-schema";

import {
	getAllOperations,
	getEntityInvariants,
	getOperationPostInvariantDefs,
	getOperationPreInvariantDefs,
} from "@morph/domain-schema";

import { declareEntityFields, declareUninterpretedSorts } from "./declarations";
import { compileSmtCondition } from "./smt-compiler";

const smtHeader = (logic: string): string =>
	`(set-logic ${logic})\n${declareUninterpretedSorts()}`;

const getEntitiesWithInvariants = (
	schema: DomainSchema,
): readonly { entityName: string; contextName: string }[] => {
	const result: { entityName: string; contextName: string }[] = [];

	for (const [contextName, context] of Object.entries(schema.contexts)) {
		for (const entityName of Object.keys(context.entities)) {
			const invariants = getEntityInvariants(schema, entityName);
			if (invariants.length > 0) {
				result.push({ entityName, contextName });
			}
		}
	}

	return result;
};

export const generateConsistencyCheck = (
	schema: DomainSchema,
): GeneratedFile | undefined => {
	const entitiesWithInvariants = getEntitiesWithInvariants(schema);
	if (entitiesWithInvariants.length === 0) return undefined;

	const lines: string[] = [smtHeader("QF_UFLIA"), ""];

	for (const { entityName, contextName } of entitiesWithInvariants) {
		const context = schema.contexts[contextName];
		if (!context) continue;
		const entity = context.entities[entityName];
		if (!entity) continue;
		const invariants = getEntityInvariants(schema, entityName);
		const entityVariable = entityName.toLowerCase();

		lines.push(`; --- Entity: ${entityName} ---`);
		lines.push("(push 1)");
		lines.push(`(echo "consistency:${entityName}")`);
		lines.push(declareEntityFields(entityName, entity, entityVariable));
		lines.push("");

		for (const inv of invariants) {
			lines.push(`; Invariant: ${inv.name} — ${inv.description}`);
			const compiled = compileSmtCondition(
				inv.condition,
				entityVariable,
				"ctx",
			);
			lines.push(`(assert ${compiled})`);
		}

		lines.push("");
		lines.push("(check-sat)");
		lines.push("(pop 1)");
		lines.push("");
	}

	return {
		filename: "tests/verification/src/checks/consistency.smt2",
		content: lines.join("\n"),
	};
};

export const generateSatisfiabilityCheck = (
	schema: DomainSchema,
): GeneratedFile | undefined => {
	const operations = getAllOperations(schema);
	const operationsWithPre = operations.filter((op) => {
		const pre = getOperationPreInvariantDefs(schema, op.name);
		return pre.length > 0;
	});

	if (operationsWithPre.length === 0) return undefined;

	const lines: string[] = [smtHeader("QF_UFLIA"), ""];

	for (const op of operationsWithPre) {
		const preInvariants = getOperationPreInvariantDefs(schema, op.name);
		const contextDef = schema.contexts[op.context];
		if (!contextDef) continue;

		lines.push(`; --- Operation: ${op.name} ---`);
		lines.push("(push 1)");
		lines.push(`(echo "satisfiability:${op.name}")`);

		for (const [entityName, entity] of Object.entries(contextDef.entities)) {
			const entityVariable = entityName.toLowerCase();
			lines.push(declareEntityFields(entityName, entity, entityVariable));
		}
		lines.push("");

		for (const inv of preInvariants) {
			lines.push(`; Pre-invariant: ${inv.name}`);
			const entityVariable =
				inv.scope.kind === "entity" ? inv.scope.entity.toLowerCase() : "entity";
			const compiled = compileSmtCondition(
				inv.condition,
				entityVariable,
				"ctx",
			);
			lines.push(`(assert ${compiled})`);
		}

		lines.push("");
		lines.push("(check-sat)");
		lines.push("(pop 1)");
		lines.push("");
	}

	return {
		filename: "tests/verification/src/checks/precondition-satisfiability.smt2",
		content: lines.join("\n"),
	};
};

export const generatePreservationCheck = (
	schema: DomainSchema,
): GeneratedFile | undefined => {
	const operations = getAllOperations(schema);
	const operationsWithPost = operations.filter((op) => {
		const post = getOperationPostInvariantDefs(schema, op.name);
		return post.length > 0;
	});

	if (operationsWithPost.length === 0) return undefined;

	const lines: string[] = [smtHeader("QF_UFLIA"), ""];

	for (const op of operationsWithPost) {
		const preInvariants = getOperationPreInvariantDefs(schema, op.name);
		const postInvariants = getOperationPostInvariantDefs(schema, op.name);
		const contextDef = schema.contexts[op.context];
		if (!contextDef) continue;

		const entitiesWithInvariants = getEntitiesWithInvariants(schema).filter(
			(entry) => entry.contextName === op.context,
		);

		if (entitiesWithInvariants.length === 0) continue;

		lines.push(`; --- Operation: ${op.name} ---`);

		for (const { entityName } of entitiesWithInvariants) {
			const entity = contextDef.entities[entityName];
			if (!entity) continue;
			const entityInvariants = getEntityInvariants(schema, entityName);
			if (entityInvariants.length === 0) continue;

			const entityVariable = entityName.toLowerCase();
			const postEntityVariable = `${entityVariable}_post`;

			lines.push("(push 1)");
			lines.push(`(echo "preservation:${op.name}:${entityName}")`);

			lines.push(`; Pre-state for ${entityName}`);
			lines.push(declareEntityFields(entityName, entity, entityVariable));
			lines.push(`; Post-state for ${entityName}`);
			lines.push(declareEntityFields(entityName, entity, postEntityVariable));
			lines.push("");

			for (const inv of preInvariants) {
				lines.push(`; Assert pre-invariant: ${inv.name}`);
				const preEntityVariable =
					inv.scope.kind === "entity"
						? inv.scope.entity.toLowerCase()
						: entityVariable;
				const compiled = compileSmtCondition(
					inv.condition,
					preEntityVariable,
					"ctx",
				);
				lines.push(`(assert ${compiled})`);
			}

			for (const inv of postInvariants) {
				lines.push(`; Assert post-invariant: ${inv.name}`);
				const compiled = compileSmtCondition(
					inv.condition,
					postEntityVariable,
					"ctx",
				);
				lines.push(`(assert ${compiled})`);
			}

			lines.push("");
			lines.push(`; Negate entity invariant — unsat means preserved`);
			const entityInvariantParts = entityInvariants.map((inv) =>
				compileSmtCondition(inv.condition, postEntityVariable, "ctx"),
			);
			const combined =
				entityInvariantParts.length === 1
					? (entityInvariantParts[0] ?? "true")
					: `(and ${entityInvariantParts.join(" ")})`;
			lines.push(`(assert (not ${combined}))`);

			lines.push("");
			lines.push("(check-sat)");
			lines.push("(pop 1)");
			lines.push("");
		}
	}

	return {
		filename: "tests/verification/src/checks/preservation.smt2",
		content: lines.join("\n"),
	};
};
