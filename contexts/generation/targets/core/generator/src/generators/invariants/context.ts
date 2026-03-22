/**
 * Context type inference for invariants.
 */
import type { ConditionExpr, ValueExpr } from "@morph/domain-schema";

/**
 * Context field with inferred element type.
 */
export interface ContextField {
	readonly elementType: string; // e.g., "User" or "{ id: unknown }"
	readonly isCollection: boolean; // true for arrays like "users", false for single values like "currentUser"
	readonly name: string;
}

/**
 * Infer required context fields from a condition expression.
 * Returns the fields that need to be provided in the context parameter,
 * along with inferred element types based on property access patterns.
 */
export const inferContextFields = (
	condition: ConditionExpr,
): ContextField[] => {
	const fields = new Map<string, Set<string>>(); // field name -> accessed properties
	const collectionFields = new Set<string>(); // fields used as collections in forAll/exists

	const walkCondition = (
		cond: ConditionExpr,
		boundVariables: Map<string, string>,
	): void => {
		switch (cond.kind) {
			case "and":
			case "or": {
				for (const c of cond.conditions) walkCondition(c, boundVariables);
				break;
			}
			case "contains": {
				walkValue(cond.collection, boundVariables);
				walkValue(cond.value, boundVariables);
				break;
			}
			case "equals":
			case "greaterThan":
			case "greaterThanOrEqual":
			case "lessThan":
			case "lessThanOrEqual":
			case "notEquals": {
				walkValue(cond.left, boundVariables);
				walkValue(cond.right, boundVariables);
				break;
			}
			case "exists":
			case "forAll": {
				// Get the collection field name
				if (cond.collection.kind === "field") {
					const parts = cond.collection.path.split(".");
					if (
						parts.length === 1 &&
						parts[0] !== undefined &&
						!fields.has(parts[0])
					) {
						fields.set(parts[0], new Set());
						collectionFields.add(parts[0]); // Mark as collection
					}
				}
				// Track the bound variable -> collection field mapping
				const newBoundVariables = new Map(boundVariables);
				if (cond.collection.kind === "field") {
					const parts = cond.collection.path.split(".");
					if (parts.length === 1 && parts[0] !== undefined) {
						newBoundVariables.set(cond.variable, parts[0]);
					}
				}
				walkCondition(cond.condition, newBoundVariables);
				break;
			}
			case "implies": {
				walkCondition(cond.if, boundVariables);
				walkCondition(cond.then, boundVariables);
				break;
			}
			case "not": {
				walkCondition(cond.condition, boundVariables);
				break;
			}
		}
	};

	const walkValue = (
		value: ValueExpr,
		boundVariables: Map<string, string>,
	): void => {
		switch (value.kind) {
			case "call": {
				for (const arg of value.args) walkValue(arg, boundVariables);
				break;
			}
			case "count": {
				walkValue(value.collection, boundVariables);
				break;
			}
			case "field": {
				const parts = value.path.split(".");
				// Handle context.currentUser paths (e.g., "context.currentUser.id")
				// currentUser is NOT a collection - it's a single user object
				if (parts[0] === "context" && parts[1] === "currentUser") {
					if (!fields.has("currentUser")) {
						fields.set("currentUser", new Set());
						// Don't add to collectionFields - currentUser is a single object
					}
					// Track property access on currentUser (e.g., "id")
					if (parts[2] !== undefined) {
						const props = fields.get("currentUser");
						if (props) {
							props.add(parts[2]);
						}
					}
					break;
				}
				// Handle currentUser paths directly (e.g., "currentUser.id")
				if (parts[0] === "currentUser") {
					if (!fields.has("currentUser")) {
						fields.set("currentUser", new Set());
						// Don't add to collectionFields - currentUser is a single object
					}
					if (parts[1] !== undefined) {
						const props = fields.get("currentUser");
						if (props) {
							props.add(parts[1]);
						}
					}
					break;
				}
				// Single-part paths like "users" are context fields
				if (
					parts.length === 1 &&
					parts[0] !== undefined &&
					!fields.has(parts[0])
				) {
					fields.set(parts[0], new Set());
				}
				// Multi-part paths like "user.id" - track property access
				if (
					parts.length >= 2 &&
					parts[0] !== undefined &&
					parts[1] !== undefined
				) {
					const variableName = parts[0];
					const propertyName = parts[1];
					const fieldName = boundVariables.get(variableName);
					if (fieldName !== undefined) {
						const props = fields.get(fieldName);
						if (props) {
							props.add(propertyName);
						}
					}
				}
				break;
			}
			case "literal":
			case "variable": {
				break;
			}
		}
	};

	walkCondition(condition, new Map());

	// Convert to ContextField array with inferred types
	return [...fields.entries()].map(([name, props]) => {
		// Build element type from accessed properties
		const elementType =
			props.size > 0
				? `{ ${[...props].map((p) => `readonly ${p}: unknown`).join("; ")} }`
				: "unknown";
		const isCollection = collectionFields.has(name);
		return { elementType, isCollection, name };
	});
};

/**
 * Infer required input fields from a condition expression.
 * Walks the condition AST and collects all `input.*` field paths.
 */
export const inferInputFields = (condition: ConditionExpr): string[] => {
	const fields = new Set<string>();

	const walkCondition = (cond: ConditionExpr): void => {
		switch (cond.kind) {
			case "and":
			case "or": {
				for (const c of cond.conditions) walkCondition(c);
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
				walkValue(cond.collection);
				walkCondition(cond.condition);
				break;
			}
			case "implies": {
				walkCondition(cond.if);
				walkCondition(cond.then);
				break;
			}
			case "not": {
				walkCondition(cond.condition);
				break;
			}
		}
	};

	const walkValue = (value: ValueExpr): void => {
		switch (value.kind) {
			case "call": {
				for (const arg of value.args) walkValue(arg);
				break;
			}
			case "count": {
				walkValue(value.collection);
				break;
			}
			case "field": {
				const parts = value.path.split(".");
				if (parts[0] === "input" && parts[1] !== undefined) {
					fields.add(parts[1]);
				}
				break;
			}
			case "literal":
			case "variable": {
				break;
			}
		}
	};

	walkCondition(condition);
	return [...fields];
};
