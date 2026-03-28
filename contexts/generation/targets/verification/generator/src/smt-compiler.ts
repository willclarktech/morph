import type { ConditionExpr, ValueExpr } from "@morph/domain-schema";

const COLLECTION_BOUND = 5;

export interface SmtCollector {
	readonly collectionBounds: Map<string, number>;
	readonly contextIds: Map<string, string>;
	readonly inputIds: Map<string, string>;
	readonly literalIds: Map<string, string>;
}

export type VariableMapping = Readonly<Record<string, string>>;

export const createSmtCollector = (): SmtCollector => ({
	collectionBounds: new Map(),
	contextIds: new Map(),
	inputIds: new Map(),
	literalIds: new Map(),
});

const addCollectionDeclarations = (
	collector: SmtCollector,
	collectionBase: string,
	entityVariable: string,
): void => {
	if (collectionBase.startsWith(`${entityVariable}_`)) return;
	const targetMap = collectionBase.startsWith("input_")
		? collector.inputIds
		: collector.contextIds;
	targetMap.set(`${collectionBase}_len`, "Int");
	collector.collectionBounds.set(collectionBase, COLLECTION_BOUND);
	for (let index = 0; index < COLLECTION_BOUND; index++) {
		targetMap.set(`${collectionBase}_${index}`, "StringId");
	}
};

export const compileSmtCondition = (
	condition: ConditionExpr,
	entityVariable: string,
	contextVariable: string,
	collector?: SmtCollector,
	variableMapping?: VariableMapping,
): string => {
	switch (condition.kind) {
		case "and": {
			const parts = condition.conditions.map((c) =>
				compileSmtCondition(
					c,
					entityVariable,
					contextVariable,
					collector,
					variableMapping,
				),
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
				collector,
				variableMapping,
			);
			const collectionBase = compileSmtValue(
				condition.collection,
				entityVariable,
				contextVariable,
				collector,
				variableMapping,
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
			return `(= ${compileSmtValue(condition.left, entityVariable, contextVariable, collector, variableMapping)} ${compileSmtValue(condition.right, entityVariable, contextVariable, collector, variableMapping)})`;
		}

		case "exists": {
			const collectionBase = compileSmtValue(
				condition.collection,
				entityVariable,
				contextVariable,
				collector,
				variableMapping,
			);
			const collectionLength = `${collectionBase}_len`;
			if (collector) {
				addCollectionDeclarations(collector, collectionBase, entityVariable);
			}
			const disjuncts = Array.from({ length: COLLECTION_BOUND }, (_, index) => {
				const innerMapping = {
					...variableMapping,
					[condition.variable]: `${collectionBase}_${index}`,
				};
				const body = compileSmtCondition(
					condition.condition,
					entityVariable,
					contextVariable,
					collector,
					innerMapping,
				);
				return `(and (>= ${collectionLength} ${index + 1}) ${body})`;
			});
			return `(or ${disjuncts.join(" ")})`;
		}

		case "forAll": {
			const collectionBase = compileSmtValue(
				condition.collection,
				entityVariable,
				contextVariable,
				collector,
				variableMapping,
			);
			const collectionLength = `${collectionBase}_len`;
			if (collector) {
				addCollectionDeclarations(collector, collectionBase, entityVariable);
			}
			const conjuncts = Array.from({ length: COLLECTION_BOUND }, (_, index) => {
				const innerMapping = {
					...variableMapping,
					[condition.variable]: `${collectionBase}_${index}`,
				};
				const body = compileSmtCondition(
					condition.condition,
					entityVariable,
					contextVariable,
					collector,
					innerMapping,
				);
				return `(=> (>= ${collectionLength} ${index + 1}) ${body})`;
			});
			return `(and ${conjuncts.join(" ")})`;
		}

		case "greaterThan": {
			return `(> ${compileSmtValue(condition.left, entityVariable, contextVariable, collector, variableMapping)} ${compileSmtValue(condition.right, entityVariable, contextVariable, collector, variableMapping)})`;
		}

		case "greaterThanOrEqual": {
			return `(>= ${compileSmtValue(condition.left, entityVariable, contextVariable, collector, variableMapping)} ${compileSmtValue(condition.right, entityVariable, contextVariable, collector, variableMapping)})`;
		}

		case "implies": {
			return `(=> ${compileSmtCondition(condition.if, entityVariable, contextVariable, collector, variableMapping)} ${compileSmtCondition(condition.then, entityVariable, contextVariable, collector, variableMapping)})`;
		}

		case "lessThan": {
			return `(< ${compileSmtValue(condition.left, entityVariable, contextVariable, collector, variableMapping)} ${compileSmtValue(condition.right, entityVariable, contextVariable, collector, variableMapping)})`;
		}

		case "lessThanOrEqual": {
			return `(<= ${compileSmtValue(condition.left, entityVariable, contextVariable, collector, variableMapping)} ${compileSmtValue(condition.right, entityVariable, contextVariable, collector, variableMapping)})`;
		}

		case "not": {
			return `(not ${compileSmtCondition(condition.condition, entityVariable, contextVariable, collector, variableMapping)})`;
		}

		case "notEquals": {
			return `(distinct ${compileSmtValue(condition.left, entityVariable, contextVariable, collector, variableMapping)} ${compileSmtValue(condition.right, entityVariable, contextVariable, collector, variableMapping)})`;
		}

		case "or": {
			const parts = condition.conditions.map((c) =>
				compileSmtCondition(
					c,
					entityVariable,
					contextVariable,
					collector,
					variableMapping,
				),
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
	collector?: SmtCollector,
	variableMapping?: VariableMapping,
): string => {
	switch (value.kind) {
		case "call": {
			const args = value.args.map((a) =>
				compileSmtValue(
					a,
					entityVariable,
					contextVariable,
					collector,
					variableMapping,
				),
			);
			return `(${smtIdentifier(value.name)} ${args.join(" ")})`;
		}

		case "count": {
			const collectionBase = compileSmtValue(
				value.collection,
				entityVariable,
				contextVariable,
				collector,
				variableMapping,
			);
			return `${collectionBase}_len`;
		}

		case "field": {
			return resolveSmtFieldPath(
				value.path,
				entityVariable,
				contextVariable,
				collector,
				variableMapping,
			);
		}

		case "literal": {
			return toSmtLiteral(value.value, collector);
		}

		case "variable": {
			const mapped = variableMapping?.[value.name];
			if (mapped !== undefined) {
				return smtIdentifier(mapped);
			}
			return smtIdentifier(value.name);
		}
	}
};

const resolveSmtFieldPath = (
	path: string,
	entityVariable: string,
	contextVariable: string,
	collector?: SmtCollector,
	variableMapping?: VariableMapping,
): string => {
	const parts = path.split(".");

	const mappedVariable = parts[0] ? variableMapping?.[parts[0]] : undefined;
	if (mappedVariable !== undefined) {
		const id = smtIdentifier(
			parts.length === 1
				? mappedVariable
				: `${mappedVariable}_${parts.slice(1).join("_")}`,
		);
		if (collector && parts.length > 1 && parts[0] !== entityVariable) {
			collector.contextIds.set(id, "StringId");
		}
		return id;
	}

	if (parts[0] === entityVariable || parts[0] === "this") {
		return smtIdentifier(`${entityVariable}_${parts.slice(1).join("_")}`);
	}

	if (parts[0] === "context") {
		const id = smtIdentifier(`${contextVariable}_${parts.slice(1).join("_")}`);
		if (collector) collector.contextIds.set(id, "StringId");
		return id;
	}

	if (parts[0] === "currentUser") {
		const id = smtIdentifier(`${contextVariable}_${parts.join("_")}`);
		if (collector) collector.contextIds.set(id, "StringId");
		return id;
	}

	if (parts[0] === "input") {
		const id = smtIdentifier(parts.join("_"));
		if (collector) collector.inputIds.set(id, "StringId");
		return id;
	}

	if (parts.length === 1) {
		const id = smtIdentifier(`${contextVariable}_${path}`);
		if (collector) collector.contextIds.set(id, "StringId");
		return id;
	}

	return smtIdentifier(parts.join("_"));
};

const smtIdentifier = (name: string): string => name.replaceAll(/\W/g, "_");

const toSmtLiteral = (value: unknown, collector?: SmtCollector): string => {
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
		const id = `|str_${smtIdentifier(value)}|`;
		if (collector) collector.literalIds.set(id, "StringId");
		return id;
	}
	if (value === undefined) {
		return "smt_undefined";
	}
	return `|lit_${JSON.stringify(value)}|`;
};
