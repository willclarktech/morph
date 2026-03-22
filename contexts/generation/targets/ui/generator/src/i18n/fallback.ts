/**
 * Fallback domain translation generation.
 */
import type { DomainSchema } from "@morph/domain-schema";

import {
	getAllEntities,
	getAllErrors,
	getAllOperations,
} from "@morph/domain-schema";
import { pluralize, toTitleCase } from "@morph/utils";

/**
 * Generate fallback domain translations when textConfig is not provided.
 * This allows backward compatibility while encouraging explicit text configs.
 */
export const generateFallbackDomainTranslations = (
	schema: DomainSchema,
): Record<string, Record<string, string>> => {
	const translations: Record<string, Record<string, string>> = {};
	const entities = getAllEntities(schema);
	const ops = getAllOperations(schema).filter((op) =>
		op.def.tags.includes("@ui"),
	);
	const errors = getAllErrors(schema);

	// Add entity-specific translations
	for (const entity of entities) {
		const entityName = entity.name;
		const entityKey = entityName.toLowerCase();
		const singular = toTitleCase(entityName);
		const plural = toTitleCase(pluralize(entityName));

		translations[`entity.${entityKey}.singular`] = {
			de: singular,
			en: singular,
		};
		translations[`entity.${entityKey}.plural`] = { de: plural, en: plural };

		// Add attribute/field translations for this entity
		for (const [attributeName, attributeDef] of Object.entries(
			entity.def.attributes,
		)) {
			const label = toTitleCase(attributeName);
			translations[`field.${entityKey}.${attributeName}`] = {
				de: label,
				en: label,
			};
			if (attributeDef.description) {
				translations[`help.${entityKey}.${attributeName}`] = {
					de: attributeDef.description,
					en: attributeDef.description,
				};
			}
		}
	}

	// Add operation-specific translations (including input param labels)
	for (const op of ops) {
		const label = toTitleCase(op.name);
		translations[`op.${op.name}`] = { de: label, en: label };

		// Find the entity this op belongs to and add input param translations
		const entity = entities.find((ent) =>
			op.name.toLowerCase().includes(ent.name.toLowerCase()),
		);
		if (entity) {
			const entityKey = entity.name.toLowerCase();
			for (const [paramName, paramDef] of Object.entries(op.def.input)) {
				const key = `field.${entityKey}.${paramName}`;
				const paramLabel = toTitleCase(paramName);
				translations[key] ??= { de: paramLabel, en: paramLabel };
				if (paramDef.description) {
					const helpKey = `help.${entityKey}.${paramName}`;
					translations[helpKey] ??= {
						de: paramDef.description,
						en: paramDef.description,
					};
				}
			}
		}
	}

	// Add error translations
	for (const error of errors) {
		const label = toTitleCase(error.name);
		translations[`error.${error.name}`] = { de: label, en: label };
	}

	return translations;
};
