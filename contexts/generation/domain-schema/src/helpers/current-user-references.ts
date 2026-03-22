/**
 * Current user reference detection in condition expressions.
 */
import type { ConditionExpr, ValueExpr } from "../schemas";

/**
 * Check if a field path references context.currentUser.
 */
const fieldPathReferencesCurrentUser = (path: string): boolean => {
	const parts = path.split(".");
	if (parts[0] === "context" && parts[1] === "currentUser") {
		return true;
	}
	if (parts[0] === "currentUser") {
		return true;
	}
	return false;
};

/**
 * Check if a value expression references context.currentUser.
 */
const valueReferencesCurrentUser = (value: ValueExpr): boolean => {
	switch (value.kind) {
		case "call": {
			return value.args.some(valueReferencesCurrentUser);
		}
		case "count": {
			return valueReferencesCurrentUser(value.collection);
		}
		case "field": {
			return fieldPathReferencesCurrentUser(value.path);
		}
		case "literal":
		case "variable": {
			return false;
		}
	}
};

/**
 * Check if a condition expression references context.currentUser.
 * Used to infer whether an operation requires authentication.
 */
export const conditionReferencesCurrentUser = (
	condition: ConditionExpr,
): boolean => {
	switch (condition.kind) {
		case "and":
		case "or": {
			return condition.conditions.some(conditionReferencesCurrentUser);
		}
		case "contains": {
			return (
				valueReferencesCurrentUser(condition.collection) ||
				valueReferencesCurrentUser(condition.value)
			);
		}
		case "equals":
		case "greaterThan":
		case "greaterThanOrEqual":
		case "lessThan":
		case "lessThanOrEqual":
		case "notEquals": {
			return (
				valueReferencesCurrentUser(condition.left) ||
				valueReferencesCurrentUser(condition.right)
			);
		}
		case "exists":
		case "forAll": {
			return (
				valueReferencesCurrentUser(condition.collection) ||
				conditionReferencesCurrentUser(condition.condition)
			);
		}
		case "implies": {
			return (
				conditionReferencesCurrentUser(condition.if) ||
				conditionReferencesCurrentUser(condition.then)
			);
		}
		case "not": {
			return conditionReferencesCurrentUser(condition.condition);
		}
	}
};
