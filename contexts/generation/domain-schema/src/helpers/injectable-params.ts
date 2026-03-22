/**
 * Injectable parameter extraction from invariant conditions.
 */
import type { ConditionExpr, ValueExpr } from "../schemas";

/**
 * Injectable parameter info.
 * Represents a parameter that can be auto-filled from execution context.
 */
export interface InjectableParam {
	readonly paramName: string;
	readonly contextPath: string;
	readonly invariantName: string;
}

/**
 * Extract the input field name from a field path (e.g., "input.userId" -> "userId").
 * Returns undefined if not an input reference.
 */
const extractInputFieldName = (path: string): string | undefined => {
	const parts = path.split(".");
	if (parts[0] === "input" && parts.length === 2) {
		return parts[1];
	}
	return undefined;
};

/**
 * Extract the context path from a field path (e.g., "context.currentUser.id" -> "currentUser.id").
 * Returns undefined if not a context reference.
 */
const extractContextPath = (path: string): string | undefined => {
	const parts = path.split(".");
	if (parts[0] === "context" && parts.length >= 2) {
		return parts.slice(1).join(".");
	}
	return undefined;
};

/**
 * Extract injectable parameters from an equality condition.
 * Detects patterns like `input.X === context.Y` or `context.Y === input.X`.
 */
const extractFromEquality = (
	left: ValueExpr,
	right: ValueExpr,
	invariantName: string,
): InjectableParam | undefined => {
	if (left.kind !== "field" || right.kind !== "field") return undefined;

	// Try input.X === context.Y
	const leftInput = extractInputFieldName(left.path);
	const rightContext = extractContextPath(right.path);
	if (leftInput !== undefined && rightContext !== undefined) {
		return { paramName: leftInput, contextPath: rightContext, invariantName };
	}

	// Try context.Y === input.X (reversed)
	const leftContext = extractContextPath(left.path);
	const rightInput = extractInputFieldName(right.path);
	if (leftContext !== undefined && rightInput !== undefined) {
		return { paramName: rightInput, contextPath: leftContext, invariantName };
	}

	return undefined;
};

/**
 * Extract injectable parameters from a condition expression.
 * Walks the AST to find equality patterns: `input.X === context.Y`.
 */
export const extractInjectableParams = (
	condition: ConditionExpr,
	invariantName: string,
): readonly InjectableParam[] => {
	switch (condition.kind) {
		case "and":
		case "or": {
			return condition.conditions.flatMap((c) =>
				extractInjectableParams(c, invariantName),
			);
		}
		case "contains":
		case "greaterThan":
		case "greaterThanOrEqual":
		case "lessThan":
		case "lessThanOrEqual":
		case "notEquals": {
			// Non-equality comparisons don't support injection
			return [];
		}
		case "equals": {
			const result = extractFromEquality(
				condition.left,
				condition.right,
				invariantName,
			);
			return result ? [result] : [];
		}
		case "exists":
		case "forAll": {
			return extractInjectableParams(condition.condition, invariantName);
		}
		case "implies": {
			return [
				...extractInjectableParams(condition.if, invariantName),
				...extractInjectableParams(condition.then, invariantName),
			];
		}
		case "not": {
			// Don't extract from negated conditions
			return [];
		}
	}
};
