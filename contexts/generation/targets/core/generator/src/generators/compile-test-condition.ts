/**
 * Condition compiler for property test assertions.
 *
 * This compiles invariant conditions to TypeScript boolean expressions
 * for use in property tests (verifying condition vs validator agreement).
 */
import type { ConditionExpr, ValueExpr } from "@morph/domain-schema";

/**
 * Compile a ConditionExpr to a TypeScript boolean expression for property tests.
 */
export const compileTestCondition = (
	condition: ConditionExpr,
	entityVariable: string,
	contextVariable: string,
): string => {
	switch (condition.kind) {
		case "and": {
			return condition.conditions
				.map(
					(c) =>
						`(${compileTestCondition(c, entityVariable, contextVariable)})`,
				)
				.join(" && ");
		}

		case "contains": {
			return `${compileValue(condition.collection, entityVariable, contextVariable)}.includes(${compileValue(condition.value, entityVariable, contextVariable)})`;
		}

		case "equals": {
			return `${compileValue(condition.left, entityVariable, contextVariable)} === ${compileValue(condition.right, entityVariable, contextVariable)}`;
		}

		case "exists": {
			return `${compileValue(condition.collection, entityVariable, contextVariable)}.some((${condition.variable}) => ${compileTestCondition(condition.condition, condition.variable, contextVariable)})`;
		}

		case "forAll": {
			return `${compileValue(condition.collection, entityVariable, contextVariable)}.every((${condition.variable}) => ${compileTestCondition(condition.condition, condition.variable, contextVariable)})`;
		}

		case "greaterThan": {
			return `${compileValue(condition.left, entityVariable, contextVariable)} > ${compileValue(condition.right, entityVariable, contextVariable)}`;
		}

		case "greaterThanOrEqual": {
			return `${compileValue(condition.left, entityVariable, contextVariable)} >= ${compileValue(condition.right, entityVariable, contextVariable)}`;
		}

		case "implies": {
			return `!(${compileTestCondition(condition.if, entityVariable, contextVariable)}) || (${compileTestCondition(condition.then, entityVariable, contextVariable)})`;
		}

		case "lessThan": {
			return `${compileValue(condition.left, entityVariable, contextVariable)} < ${compileValue(condition.right, entityVariable, contextVariable)}`;
		}

		case "lessThanOrEqual": {
			return `${compileValue(condition.left, entityVariable, contextVariable)} <= ${compileValue(condition.right, entityVariable, contextVariable)}`;
		}

		case "not": {
			return `!(${compileTestCondition(condition.condition, entityVariable, contextVariable)})`;
		}

		case "notEquals": {
			return `${compileValue(condition.left, entityVariable, contextVariable)} !== ${compileValue(condition.right, entityVariable, contextVariable)}`;
		}

		case "or": {
			return condition.conditions
				.map(
					(c) =>
						`(${compileTestCondition(c, entityVariable, contextVariable)})`,
				)
				.join(" || ");
		}
	}
};

const compileValue = (
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

const resolveFieldPath = (
	path: string,
	entityVariable: string,
	contextVariable: string,
): string => {
	const parts = path.split(".");

	if (parts[0] === entityVariable || parts[0] === "this") {
		return `${entityVariable}.${parts.slice(1).join(".")}`;
	}

	if (parts[0] === "context") {
		return `${contextVariable}.${parts.slice(1).join(".")}`;
	}

	if (parts[0] === "currentUser") {
		return `${contextVariable}.${path}`;
	}

	if (parts.length === 1) {
		return `${contextVariable}.${path}`;
	}

	return path;
};
