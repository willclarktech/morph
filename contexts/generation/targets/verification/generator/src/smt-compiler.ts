import type { ConditionExpr, ValueExpr } from "@morph/domain-schema";

const COLLECTION_BOUND = 5;

export const compileSmtCondition = (
	condition: ConditionExpr,
	entityVariable: string,
	contextVariable: string,
): string => {
	switch (condition.kind) {
		case "and": {
			const parts = condition.conditions.map((c) =>
				compileSmtCondition(c, entityVariable, contextVariable),
			);
			if (parts.length === 0) return "true";
			if (parts.length === 1) return parts[0] ?? "true";
			return `(and ${parts.join(" ")})`;
		}

		case "contains": {
			const value = compileSmtValue(
				condition.value,
				entityVariable,
				contextVariable,
			);
			const collectionBase = compileSmtValue(
				condition.collection,
				entityVariable,
				contextVariable,
			);
			const collectionLength = `${collectionBase}_len`;
			const disjuncts = Array.from(
				{ length: COLLECTION_BOUND },
				(_, index) =>
					`(and (>= ${collectionLength} ${index + 1}) (= ${value} ${collectionBase}_${index}))`,
			);
			return `(or ${disjuncts.join(" ")})`;
		}

		case "equals": {
			return `(= ${compileSmtValue(condition.left, entityVariable, contextVariable)} ${compileSmtValue(condition.right, entityVariable, contextVariable)})`;
		}

		case "exists": {
			const collectionBase = compileSmtValue(
				condition.collection,
				entityVariable,
				contextVariable,
			);
			const collectionLength = `${collectionBase}_len`;
			const disjuncts = Array.from({ length: COLLECTION_BOUND }, (_, index) => {
				const body = compileSmtCondition(
					condition.condition,
					condition.variable,
					contextVariable,
				);
				const substituted = body.replaceAll(
					condition.variable,
					`${collectionBase}_${index}`,
				);
				return `(and (>= ${collectionLength} ${index + 1}) ${substituted})`;
			});
			return `(or ${disjuncts.join(" ")})`;
		}

		case "forAll": {
			const collectionBase = compileSmtValue(
				condition.collection,
				entityVariable,
				contextVariable,
			);
			const collectionLength = `${collectionBase}_len`;
			const conjuncts = Array.from({ length: COLLECTION_BOUND }, (_, index) => {
				const body = compileSmtCondition(
					condition.condition,
					condition.variable,
					contextVariable,
				);
				const substituted = body.replaceAll(
					condition.variable,
					`${collectionBase}_${index}`,
				);
				return `(=> (>= ${collectionLength} ${index + 1}) ${substituted})`;
			});
			return `(and ${conjuncts.join(" ")})`;
		}

		case "greaterThan": {
			return `(> ${compileSmtValue(condition.left, entityVariable, contextVariable)} ${compileSmtValue(condition.right, entityVariable, contextVariable)})`;
		}

		case "greaterThanOrEqual": {
			return `(>= ${compileSmtValue(condition.left, entityVariable, contextVariable)} ${compileSmtValue(condition.right, entityVariable, contextVariable)})`;
		}

		case "implies": {
			return `(=> ${compileSmtCondition(condition.if, entityVariable, contextVariable)} ${compileSmtCondition(condition.then, entityVariable, contextVariable)})`;
		}

		case "lessThan": {
			return `(< ${compileSmtValue(condition.left, entityVariable, contextVariable)} ${compileSmtValue(condition.right, entityVariable, contextVariable)})`;
		}

		case "lessThanOrEqual": {
			return `(<= ${compileSmtValue(condition.left, entityVariable, contextVariable)} ${compileSmtValue(condition.right, entityVariable, contextVariable)})`;
		}

		case "not": {
			return `(not ${compileSmtCondition(condition.condition, entityVariable, contextVariable)})`;
		}

		case "notEquals": {
			return `(distinct ${compileSmtValue(condition.left, entityVariable, contextVariable)} ${compileSmtValue(condition.right, entityVariable, contextVariable)})`;
		}

		case "or": {
			const parts = condition.conditions.map((c) =>
				compileSmtCondition(c, entityVariable, contextVariable),
			);
			if (parts.length === 0) return "false";
			if (parts.length === 1) return parts[0] ?? "false";
			return `(or ${parts.join(" ")})`;
		}
	}
};

export const compileSmtValue = (
	value: ValueExpr,
	entityVariable: string,
	contextVariable: string,
): string => {
	switch (value.kind) {
		case "call": {
			const args = value.args.map((a) =>
				compileSmtValue(a, entityVariable, contextVariable),
			);
			return `(${smtIdentifier(value.name)} ${args.join(" ")})`;
		}

		case "count": {
			const collectionBase = compileSmtValue(
				value.collection,
				entityVariable,
				contextVariable,
			);
			return `${collectionBase}_len`;
		}

		case "field": {
			return resolveSmtFieldPath(value.path, entityVariable, contextVariable);
		}

		case "literal": {
			return toSmtLiteral(value.value);
		}

		case "variable": {
			return smtIdentifier(value.name);
		}
	}
};

const resolveSmtFieldPath = (
	path: string,
	entityVariable: string,
	contextVariable: string,
): string => {
	const parts = path.split(".");

	if (parts[0] === entityVariable || parts[0] === "this") {
		return smtIdentifier(`${entityVariable}_${parts.slice(1).join("_")}`);
	}

	if (parts[0] === "context") {
		return smtIdentifier(`${contextVariable}_${parts.slice(1).join("_")}`);
	}

	if (parts[0] === "currentUser") {
		return smtIdentifier(`${contextVariable}_${parts.join("_")}`);
	}

	if (parts[0] === "input") {
		return smtIdentifier(parts.join("_"));
	}

	if (parts.length === 1) {
		return smtIdentifier(`${contextVariable}_${path}`);
	}

	return smtIdentifier(parts.join("_"));
};

const smtIdentifier = (name: string): string => name.replaceAll(/\W/g, "_");

const toSmtLiteral = (value: unknown): string => {
	if (typeof value === "number") {
		if (Number.isInteger(value)) {
			return value < 0 ? `(- ${Math.abs(value)})` : String(value);
		}
		return value < 0 ? `(- ${Math.abs(value).toFixed(6)})` : value.toFixed(6);
	}
	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}
	if (typeof value === "string") {
		return `|str_${smtIdentifier(value)}|`;
	}
	if (value === undefined) {
		return "smt_undefined";
	}
	return `|lit_${JSON.stringify(value)}|`;
};
