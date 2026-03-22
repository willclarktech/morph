/**
 * Condition expression compiler for invariants.
 */
import type { ConditionExpr, ValueExpr } from "@morph/domain-schema";

/**
 * Compile a ConditionExpr to a TypeScript boolean expression string.
 */
export const compileCondition = (
	condition: ConditionExpr,
	entityVariable: string,
	contextVariable: string,
): string => {
	switch (condition.kind) {
		case "and": {
			return condition.conditions
				.map((c) => `(${compileCondition(c, entityVariable, contextVariable)})`)
				.join(" && ");
		}

		case "contains": {
			return `${compileValue(condition.collection, entityVariable, contextVariable)}.includes(${compileValue(condition.value, entityVariable, contextVariable)})`;
		}

		case "equals": {
			return `${compileValue(condition.left, entityVariable, contextVariable)} === ${compileValue(condition.right, entityVariable, contextVariable)}`;
		}

		case "exists": {
			return `${compileValue(condition.collection, entityVariable, contextVariable)}.some((${condition.variable}) => ${compileCondition(condition.condition, condition.variable, contextVariable)})`;
		}

		case "forAll": {
			return `${compileValue(condition.collection, entityVariable, contextVariable)}.every((${condition.variable}) => ${compileCondition(condition.condition, condition.variable, contextVariable)})`;
		}

		case "greaterThan": {
			return `${compileValue(condition.left, entityVariable, contextVariable)} > ${compileValue(condition.right, entityVariable, contextVariable)}`;
		}

		case "greaterThanOrEqual": {
			return `${compileValue(condition.left, entityVariable, contextVariable)} >= ${compileValue(condition.right, entityVariable, contextVariable)}`;
		}

		case "implies": {
			// p => q is equivalent to !p || q
			return `!(${compileCondition(condition.if, entityVariable, contextVariable)}) || (${compileCondition(condition.then, entityVariable, contextVariable)})`;
		}

		case "lessThan": {
			return `${compileValue(condition.left, entityVariable, contextVariable)} < ${compileValue(condition.right, entityVariable, contextVariable)}`;
		}

		case "lessThanOrEqual": {
			return `${compileValue(condition.left, entityVariable, contextVariable)} <= ${compileValue(condition.right, entityVariable, contextVariable)}`;
		}

		case "not": {
			return `!(${compileCondition(condition.condition, entityVariable, contextVariable)})`;
		}

		case "notEquals": {
			return `${compileValue(condition.left, entityVariable, contextVariable)} !== ${compileValue(condition.right, entityVariable, contextVariable)}`;
		}

		case "or": {
			return condition.conditions
				.map((c) => `(${compileCondition(c, entityVariable, contextVariable)})`)
				.join(" || ");
		}
	}
};

/**
 * Compile a ValueExpr to a TypeScript expression string.
 */
export const compileValue = (
	value: ValueExpr,
	entityVariable: string,
	contextVariable: string,
): string => {
	switch (value.kind) {
		case "call": {
			const args = value.args.map((a) =>
				compileValue(a, entityVariable, contextVariable),
			);
			return `${value.name}(${args.join(", ")})`;
		}

		case "count": {
			return `${compileValue(value.collection, entityVariable, contextVariable)}.length`;
		}

		case "field": {
			return resolveFieldPath(value.path, entityVariable, contextVariable);
		}

		case "literal": {
			return JSON.stringify(value.value);
		}

		case "variable": {
			return value.name;
		}
	}
};

/**
 * Resolve a field path like "user.id" or "todo.userId".
 *
 * Field paths are resolved relative to either the entity variable or context.
 * - If the path starts with a known variable (from forAll/exists), use that
 * - Otherwise, check if it looks like entity.field or context.field
 */
const resolveFieldPath = (
	path: string,
	entityVariable: string,
	contextVariable: string,
): string => {
	const parts = path.split(".");

	// If the first part matches the entity variable, use it directly
	if (parts[0] === entityVariable || parts[0] === "this") {
		return `${entityVariable}.${parts.slice(1).join(".")}`;
	}

	// Handle context.currentUser paths (e.g., "context.currentUser.id")
	if (parts[0] === "context") {
		return `${contextVariable}.${parts.slice(1).join(".")}`;
	}

	// Handle currentUser paths directly (e.g., "currentUser.id")
	if (parts[0] === "currentUser") {
		return `${contextVariable}.${path}`;
	}

	// Handle input paths (e.g., "input.userId") for context-scoped invariants
	if (parts[0] === "input") {
		return path; // Keep as-is, "input" will be a parameter
	}

	// Otherwise assume it's accessing context or a scoped variable
	// The path "users" becomes "context.users"
	// The path "user.id" (in a forAll/exists) stays as-is
	if (parts.length === 1) {
		return `${contextVariable}.${path}`;
	}

	// Multi-part path like "user.id" - the first part is likely a variable
	return path;
};
