/**
 * Input reference detection in condition expressions.
 */
import type { ConditionExpr, ValueExpr } from "../schemas";

/**
 * Check if a field path references input.*.
 */
const fieldPathReferencesInput = (path: string): boolean => {
	const parts = path.split(".");
	return parts[0] === "input";
};

/**
 * Check if a value expression references input.*.
 */
const valueReferencesInput = (value: ValueExpr): boolean => {
	switch (value.kind) {
		case "call": {
			return value.args.some(valueReferencesInput);
		}
		case "count": {
			return valueReferencesInput(value.collection);
		}
		case "field": {
			return fieldPathReferencesInput(value.path);
		}
		case "literal":
		case "variable": {
			return false;
		}
	}
};

/**
 * Check if a condition expression references input.*.
 * Used to identify context-scoped invariants that validate operation inputs.
 */
export const conditionReferencesInput = (condition: ConditionExpr): boolean => {
	switch (condition.kind) {
		case "and":
		case "or": {
			return condition.conditions.some(conditionReferencesInput);
		}
		case "contains": {
			return (
				valueReferencesInput(condition.collection) ||
				valueReferencesInput(condition.value)
			);
		}
		case "equals":
		case "greaterThan":
		case "greaterThanOrEqual":
		case "lessThan":
		case "lessThanOrEqual":
		case "notEquals": {
			return (
				valueReferencesInput(condition.left) ||
				valueReferencesInput(condition.right)
			);
		}
		case "exists":
		case "forAll": {
			return (
				valueReferencesInput(condition.collection) ||
				conditionReferencesInput(condition.condition)
			);
		}
		case "implies": {
			return (
				conditionReferencesInput(condition.if) ||
				conditionReferencesInput(condition.then)
			);
		}
		case "not": {
			return conditionReferencesInput(condition.condition);
		}
	}
};
