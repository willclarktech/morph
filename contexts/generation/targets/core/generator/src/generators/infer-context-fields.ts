/**
 * Context field inference for property test arbitrary generation.
 */
import type { ConditionExpr, ValueExpr } from "@morph/domain-schema";

import { toPascalCase } from "@morph/utils";

export interface ContextField {
	readonly name: string;
	readonly referencedEntity: string | undefined;
}

/**
 * Infer context fields needed for an invariant.
 * Attempts to infer the entity type from naming conventions.
 */
export const inferContextFields = (
	condition: ConditionExpr,
): ContextField[] => {
	const fields = new Map<string, string | undefined>();

	const walk = (cond: ConditionExpr): void => {
		switch (cond.kind) {
			case "and":
			case "or": {
				for (const c of cond.conditions) walk(c);
				break;
			}
			case "contains": {
				walkValue(cond.collection);
				walkValue(cond.value);
				break;
			}
			case "equals":
			case "greaterThan":
			case "greaterThanOrEqual":
			case "lessThan":
			case "lessThanOrEqual":
			case "notEquals": {
				walkValue(cond.left);
				walkValue(cond.right);
				break;
			}
			case "exists":
			case "forAll": {
				if (cond.collection.kind === "field") {
					const parts = cond.collection.path.split(".");
					if (parts.length === 1 && parts[0] !== undefined) {
						// Infer entity type from plural name: "users" -> "User"
						const singular = parts[0].replace(/s$/, "");
						const entityName = toPascalCase(singular);
						fields.set(parts[0], entityName);
					}
				}
				walk(cond.condition);
				break;
			}
			case "implies": {
				walk(cond.if);
				walk(cond.then);
				break;
			}
			case "not": {
				walk(cond.condition);
				break;
			}
		}
	};

	const walkValue = (value: ValueExpr): void => {
		switch (value.kind) {
			case "call": {
				for (const argument of value.args) walkValue(argument);
				break;
			}
			case "count": {
				walkValue(value.collection);
				break;
			}
			case "field": {
				const parts = value.path.split(".");
				if (
					parts.length === 1 &&
					parts[0] !== undefined &&
					!fields.has(parts[0])
				) {
					fields.set(parts[0], undefined);
				}
				break;
			}
			case "literal":
			case "variable": {
				break;
			}
		}
	};

	walk(condition);

	return [...fields.entries()].map(([name, referencedEntity]) => ({
		name,
		referencedEntity,
	}));
};
