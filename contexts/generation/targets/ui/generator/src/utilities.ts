/**
 * Utility functions for UI generation.
 */
import type {
	AttributeDef,
	CommandDef,
	DomainSchema,
	EntityDef,
	QualifiedEntry,
	TypeRef,
} from "@morphdsl/domain-schema";

import {
	conditionReferencesCurrentUser,
	getInjectableParams,
	getOperationPreInvariantDefs,
} from "@morphdsl/domain-schema";

export type AttributeCategory = "boolean" | "date" | "array" | "enum" | "text";

export interface ClassifiedAttribute {
	readonly name: string;
	readonly type: TypeRef;
	readonly category: AttributeCategory;
	readonly isInternal: boolean;
}

const resolveType = (ref: TypeRef): TypeRef =>
	ref.kind === "optional" ? resolveType(ref.inner) : ref;

const classifyCategory = (name: string, ref: TypeRef): AttributeCategory => {
	const resolved = resolveType(ref);
	if (resolved.kind === "primitive" && resolved.name === "boolean")
		return "boolean";
	if (resolved.kind === "primitive" && resolved.name === "date") return "date";
	if (resolved.kind === "primitive" && resolved.name === "datetime")
		return "date";
	if (/date|at$/i.test(name)) return "date";
	if (resolved.kind === "array") return "array";
	if (resolved.kind === "union") return "enum";
	return "text";
};

const isInternalAttribute = (name: string, ref: TypeRef): boolean => {
	const resolved = resolveType(ref);
	if (resolved.kind === "entityId") return true;
	if (/hash$/i.test(name)) return true;
	if (name === "createdAt" || name === "updatedAt") return true;
	return false;
};

export const classifyAttribute = (
	name: string,
	attribute: AttributeDef,
): ClassifiedAttribute => ({
	name,
	type: attribute.type,
	category: classifyCategory(name, attribute.type),
	isInternal: isInternalAttribute(name, attribute.type),
});

export const classifyAllAttributes = (
	entity: QualifiedEntry<EntityDef>,
): readonly ClassifiedAttribute[] =>
	Object.entries(entity.def.attributes)
		.filter(([name]) => name !== "id")
		.map(([name, attribute]) => classifyAttribute(name, attribute));

export const generateListColumns = (
	entity: QualifiedEntry<EntityDef>,
): readonly ClassifiedAttribute[] => {
	const all = classifyAllAttributes(entity);
	const titleField = inferTitleField(entity);
	const title = all.find((a) => a.name === titleField);
	const rest = all.filter((a) => !a.isInternal && a.name !== titleField);
	return [...(title ? [title] : []), ...rest.slice(0, 4)];
};

export interface DetailFields {
	readonly primary: readonly ClassifiedAttribute[];
	readonly metadata: readonly ClassifiedAttribute[];
}

export const generateDetailFields = (
	entity: QualifiedEntry<EntityDef>,
): DetailFields => {
	const all = classifyAllAttributes(entity);
	return {
		primary: all.filter((a) => !a.isInternal),
		metadata: all.filter((a) => a.isInternal),
	};
};

/**
 * Check if an operation requires authentication.
 */
export const operationRequiresAuth = (
	schema: DomainSchema,
	opName: string,
): boolean => {
	const preInvariants = getOperationPreInvariantDefs(schema, opName);
	return preInvariants.some((inv) =>
		conditionReferencesCurrentUser(inv.condition),
	);
};

/**
 * Get names of injectable params for an operation.
 */
export const getInjectableParamNames = (
	schema: DomainSchema,
	opName: string,
): Set<string> => {
	const params = getInjectableParams(schema, opName);
	return new Set(params.map((p) => p.paramName));
};

/**
 * Infer the title field for an entity.
 * Priority: "name", "title", first string attribute.
 */
export const inferTitleField = (entity: QualifiedEntry<EntityDef>): string => {
	const attributes = Object.entries(entity.def.attributes);

	// Check for "name" or "title"
	for (const [name] of attributes) {
		if (name === "name" || name === "title") return name;
	}

	// Fall back to first string attribute
	for (const [name, attribute] of attributes) {
		if (
			attribute.type.kind === "primitive" &&
			attribute.type.name === "string"
		) {
			return name;
		}
	}

	// Last resort: "id"
	return "id";
};

/**
 * Extract action verb from command name (e.g., "completeTodo" -> "complete").
 */
export const extractActionVerb = (
	cmdName: string,
	entityName: string,
): string => {
	const entityLower = entityName.toLowerCase();
	const nameLower = cmdName.toLowerCase();
	if (nameLower.endsWith(entityLower)) {
		return cmdName.slice(0, -entityName.length);
	}
	return cmdName;
};

/**
 * Find single-action commands for an entity.
 * Single-action: command that takes only the entity ID as required input.
 * Excludes create/delete patterns (those have their own UI patterns).
 */
export const getActionCommands = (
	entity: QualifiedEntry<EntityDef>,
	commands: readonly QualifiedEntry<CommandDef>[],
	schema: DomainSchema,
): readonly QualifiedEntry<CommandDef>[] => {
	const entityLower = entity.name.toLowerCase();
	const idParam = `${entityLower}Id`;

	return commands.filter((cmd) => {
		// Must reference this entity
		if (!cmd.name.toLowerCase().includes(entityLower)) return false;

		// Must be @ui tagged
		if (!cmd.def.tags.includes("@ui")) return false;

		// Exclude create/delete patterns
		const nameLower = cmd.name.toLowerCase();
		if (nameLower.startsWith("create") || nameLower.startsWith("add"))
			return false;
		if (nameLower.startsWith("delete") || nameLower.startsWith("remove"))
			return false;
		// Also exclude update/edit (those get an edit page)
		if (nameLower.startsWith("update") || nameLower.startsWith("edit"))
			return false;
		// Exclude list/get queries (not really commands)
		if (
			nameLower.startsWith("list") ||
			nameLower.startsWith("get") ||
			nameLower.startsWith("find")
		)
			return false;

		// Must take only entity ID as required input (excluding injectable params)
		const injectableParams = getInjectableParamNames(schema, cmd.name);
		const requiredParams = Object.entries(cmd.def.input).filter(
			([name, param]) => !param.optional && !injectableParams.has(name),
		);
		const firstParam = requiredParams[0];
		return requiredParams.length === 1 && firstParam?.[0] === idParam;
	});
};

export interface BooleanToggle {
	readonly attribute: string;
	readonly command: QualifiedEntry<CommandDef>;
	readonly hasReverse: boolean;
}

export const detectBooleanToggles = (
	entity: QualifiedEntry<EntityDef>,
	actionCommands: readonly QualifiedEntry<CommandDef>[],
): readonly BooleanToggle[] => {
	const booleanAttributes = Object.entries(entity.def.attributes).filter(
		([, attribute]) => {
			const resolved = resolveType(attribute.type);
			return resolved.kind === "primitive" && resolved.name === "boolean";
		},
	);

	const toggles: BooleanToggle[] = [];
	for (const [attributeName] of booleanAttributes) {
		const attributeLower = attributeName.toLowerCase();
		const match = actionCommands.find((cmd) => {
			const verb = extractActionVerb(cmd.name, entity.name).toLowerCase();
			return attributeLower.startsWith(verb);
		});
		if (match) {
			const verb = extractActionVerb(match.name, entity.name).toLowerCase();
			const hasReverse = actionCommands.some((cmd) => {
				const v = extractActionVerb(cmd.name, entity.name).toLowerCase();
				return v === `un${verb}` && cmd !== match;
			});
			toggles.push({ attribute: attributeName, command: match, hasReverse });
		}
	}
	return toggles;
};

/**
 * Map TypeRef to HTML input type.
 */
export const typeRefToInputType = (
	ref: TypeRef,
	paramName: string,
	isSensitive?: boolean,
): string => {
	if (isSensitive) return "password";

	switch (ref.kind) {
		case "array":
		case "entity":
		case "type":
		case "valueObject": {
			return "text";
		}
		case "entityId": {
			return "text";
		} // Will be a select in practice
		case "function":
		case "generic":
		case "typeParam": {
			return "text";
		}
		case "optional": {
			return typeRefToInputType(ref.inner, paramName, isSensitive);
		}
		case "primitive": {
			switch (ref.name) {
				case "boolean": {
					return "checkbox";
				}
				case "date": {
					return "date";
				}
				case "datetime": {
					return "datetime-local";
				}
				case "float":
				case "integer": {
					return "number";
				}
				case "string": {
					// Heuristics for common field names
					if (paramName.toLowerCase().includes("email")) return "email";
					if (paramName.toLowerCase().includes("url")) return "url";
					if (paramName.toLowerCase().includes("date")) return "date";
					if (paramName.toLowerCase().includes("time")) return "time";
					return "text";
				}
				case "unknown":
				case "void": {
					return "text";
				}
			}
			return "text"; // Fallback for primitives
		}
		case "union": {
			return "select";
		}
	}
};

/**
 * Generate table columns from entity attributes.
 */
export const generateTableColumns = (
	entity: QualifiedEntry<EntityDef>,
): string[] => {
	// Get non-id attributes
	const attributes = Object.entries(entity.def.attributes).filter(
		([name]) => name !== "id",
	);

	return attributes.map(([name]) => name);
};

/**
 * Generate result display for function output.
 */
export const generateResultDisplay = (output: TypeRef): string => {
	if (output.kind === "primitive" && output.name === "void") {
		return `<p>\${t("function.completedSuccessfully")}</p>`;
	}
	// For all other types, use JSON display
	return `<pre><code>\${JSON.stringify(result, undefined, 2)}</code></pre>`;
};

export {
	pluralize,
	sortObjectKeys,
	toKebabCase,
	toTitleCase,
} from "@morphdsl/utils";
