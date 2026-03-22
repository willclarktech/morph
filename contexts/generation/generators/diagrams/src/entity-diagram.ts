import type {
	DomainSchema,
	EntityDef,
	QualifiedEntry,
	RelationshipDef,
	TypeRef,
} from "@morph/domain-schema";

import { getAllEntities, getAllValueObjects } from "@morph/domain-schema";

import type { GenerateOptions } from "./generate";

import { toMermaidType } from "./mermaid";

const getAttributeConstraint = (
	name: string,
	attribute: { constraints?: readonly { kind: string }[]; type: TypeRef },
): string => {
	if (name === "id") return "PK";
	if (attribute.constraints?.some((c) => c.kind === "unique")) return "UK";
	if (attribute.type.kind === "entityId") return "FK";
	return "";
};

const renderEntityAttributes = (
	entityName: string,
	entity: EntityDef,
): string => {
	const lines: string[] = [`    ${entityName} {`];

	if (!("id" in entity.attributes)) {
		lines.push(`        string id PK`);
	}

	for (const [attributeName, attribute] of Object.entries(entity.attributes)) {
		const type = toMermaidType(attribute.type);
		const constraint = getAttributeConstraint(attributeName, attribute);
		const constraintSuffix = constraint ? ` ${constraint}` : "";
		lines.push(`        ${type} ${attributeName}${constraintSuffix}`);
	}

	lines.push(`    }`);
	return lines.join("\n");
};

const getRelationshipCardinality = (
	kind: RelationshipDef["kind"],
): { left: string; right: string } => {
	switch (kind) {
		case "belongs_to": {
			return { left: "}o", right: "||" };
		}
		case "has_many": {
			return { left: "||", right: "o{" };
		}
		case "has_one": {
			return { left: "||", right: "o|" };
		}
		case "references": {
			return { left: "}o", right: "||" };
		}
	}
};

const getRelationshipLineStyle = (kind: RelationshipDef["kind"]): string => {
	return kind === "references" ? ".." : "--";
};

interface RelationshipInfo {
	readonly description: string;
	readonly from: string;
	readonly kind: RelationshipDef["kind"];
	readonly to: string;
}

const collectRelationships = (
	entities: readonly QualifiedEntry<EntityDef>[],
): RelationshipInfo[] => {
	const relationships: RelationshipInfo[] = [];
	const seen = new Set<string>();

	for (const entry of entities) {
		const entityName = entry.name;
		const entity = entry.def;

		for (const relationship of entity.relationships) {
			const key = `${entityName}-${relationship.target}-${relationship.kind}`;
			if (seen.has(key)) continue;
			seen.add(key);

			relationships.push({
				description: relationship.description,
				from: entityName,
				kind: relationship.kind,
				to: relationship.target,
			});
		}

		for (const [attributeName, attribute] of Object.entries(
			entity.attributes,
		)) {
			if (attribute.type.kind === "entityId") {
				const targetEntity = attribute.type.entity;
				const hasExplicit = entity.relationships.some(
					(r) => r.target === targetEntity,
				);
				if (!hasExplicit) {
					const key = `${entityName}-${targetEntity}-belongs_to-implicit`;
					if (seen.has(key)) continue;
					seen.add(key);

					relationships.push({
						description: `via ${attributeName}`,
						from: entityName,
						kind: "belongs_to",
						to: targetEntity,
					});
				}
			}
		}
	}

	return relationships;
};

const renderRelationship = (relationship: RelationshipInfo): string => {
	const { left, right } = getRelationshipCardinality(relationship.kind);
	const line = getRelationshipLineStyle(relationship.kind);
	return `    ${relationship.from} ${left}${line}${right} ${relationship.to} : "${relationship.description}"`;
};

export const generateEntityDiagram = (
	schema: DomainSchema,
	options: GenerateOptions = {},
): string | undefined => {
	const { groupByContext = true, showAttributes = true } = options;

	const entities = getAllEntities(schema);
	const valueObjects = getAllValueObjects(schema);

	if (entities.length === 0 && valueObjects.length === 0) {
		return undefined;
	}

	const lines: string[] = ["erDiagram"];

	if (entities.length > 0) {
		if (groupByContext) {
			const contextGroups = new Map<string, QualifiedEntry<EntityDef>[]>();
			for (const entry of entities) {
				const group = contextGroups.get(entry.context) ?? [];
				group.push(entry);
				contextGroups.set(entry.context, group);
			}

			for (const [contextName, contextEntities] of contextGroups) {
				lines.push("");
				lines.push(`    %% Context: ${contextName}`);
				for (const entry of contextEntities) {
					if (showAttributes) {
						lines.push(renderEntityAttributes(entry.name, entry.def));
					} else {
						lines.push(`    ${entry.name}`);
					}
				}
			}
		} else {
			lines.push("");
			for (const entry of entities) {
				if (showAttributes) {
					lines.push(renderEntityAttributes(entry.name, entry.def));
				} else {
					lines.push(`    ${entry.name}`);
				}
			}
		}
	}

	if (valueObjects.length > 0 && showAttributes) {
		lines.push("");
		lines.push("    %% Value Objects");
		for (const vo of valueObjects) {
			const voLines: string[] = [`    ${vo.name} {`];
			for (const [attributeName, attribute] of Object.entries(
				vo.def.attributes,
			)) {
				const type = toMermaidType(attribute.type);
				voLines.push(`        ${type} ${attributeName}`);
			}
			voLines.push("    }");
			lines.push(voLines.join("\n"));
		}
	}

	const relationships = collectRelationships(entities);
	if (relationships.length > 0) {
		lines.push("");
		lines.push("    %% Relationships");
		for (const relationship of relationships) {
			lines.push(renderRelationship(relationship));
		}
	}

	return lines.join("\n");
};
