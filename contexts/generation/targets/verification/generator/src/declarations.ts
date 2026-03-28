import type { EntityDef, TypeRef } from "@morph/domain-schema";

const COLLECTION_BOUND = 5;

export const typeRefToSmtSort = (typeRef: TypeRef): string => {
	switch (typeRef.kind) {
		case "array": {
			return typeRefToSmtSort(typeRef.element);
		}
		case "entity":
		case "generic":
		case "type":
		case "typeParam":
		case "valueObject": {
			return "StringId";
		}
		case "entityId": {
			return "StringId";
		}
		case "function": {
			return "StringId";
		}
		case "optional": {
			return typeRefToSmtSort(typeRef.inner);
		}
		case "primitive": {
			switch (typeRef.name) {
				case "boolean": {
					return "Bool";
				}
				case "date":
				case "datetime":
				case "string":
				case "unknown":
				case "void": {
					return "StringId";
				}
				case "float": {
					return "Real";
				}
				case "integer": {
					return "Int";
				}
			}
			break;
		}
		case "union": {
			return "Int";
		}
	}
};

export const declareEntityFields = (
	_entityName: string,
	entity: EntityDef,
	variable: string,
): string => {
	const lines: string[] = [];

	for (const [attributeName, attribute] of Object.entries(entity.attributes)) {
		const sort = typeRefToSmtSort(attribute.type);
		const identifier = `${variable}_${attributeName}`;

		switch (attribute.type.kind) {
			case "array": {
				lines.push(
					...declareCollectionBound(identifier, sort, COLLECTION_BOUND),
				);
				break;
			}
			case "entity":
			case "entityId":
			case "function":
			case "generic":
			case "primitive":
			case "type":
			case "typeParam":
			case "valueObject": {
				lines.push(`(declare-const ${identifier} ${sort})`);
				break;
			}
			case "optional": {
				lines.push(`(declare-const ${identifier} ${sort})`);
				lines.push(`(declare-const ${identifier}_defined Bool)`);
				break;
			}
			case "union": {
				const unionType = attribute.type;
				lines.push(`(declare-const ${identifier} Int)`);
				lines.push(
					`(assert (and (>= ${identifier} 0) (< ${identifier} ${unionType.values.length})))`,
				);
				break;
			}
		}
	}

	return lines.join("\n");
};

export const declareCollectionBound = (
	name: string,
	elementSort: string,
	bound: number,
): string[] => {
	const lines: string[] = [];
	lines.push(`(declare-const ${name}_len Int)`);
	lines.push(`(assert (and (>= ${name}_len 0) (<= ${name}_len ${bound})))`);
	for (let index = 0; index < bound; index++) {
		lines.push(`(declare-const ${name}_${index} ${elementSort})`);
	}
	return lines;
};

export const declareUninterpretedSorts = (): string =>
	"(declare-sort StringId 0)";

export const declareFunction = (
	name: string,
	paramSorts: readonly string[],
	returnSort: string,
): string => `(declare-fun ${name} (${paramSorts.join(" ")}) ${returnSort})`;
