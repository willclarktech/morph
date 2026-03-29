/**
 * Entity page context types and builders.
 */
import type {
	CommandDef,
	DomainSchema,
	EntityDef,
	QualifiedEntry,
} from "@morphdsl/domain-schema";

import { pluralize } from "@morphdsl/utils";

import type {
	BooleanToggle,
	ClassifiedAttribute,
	DetailFields,
} from "../../utilities";

import {
	detectBooleanToggles,
	generateDetailFields,
	generateListColumns,
	generateTableColumns,
	getActionCommands,
	inferTitleField,
} from "../../utilities";

export interface EntityPageContext {
	readonly entityName: string;
	readonly pluralName: string;
	readonly titleField: string;
	readonly columns: readonly string[];
	readonly listColumns: readonly ClassifiedAttribute[];
	readonly detailFields: DetailFields;
	readonly actionCommands: readonly QualifiedEntry<CommandDef>[];
	readonly booleanToggles: readonly BooleanToggle[];
	readonly entityKey: string;
}

export const buildEntityContext = (
	entity: QualifiedEntry<EntityDef>,
	commands: readonly QualifiedEntry<CommandDef>[],
	schema: DomainSchema,
): EntityPageContext => {
	const entityName = entity.name;
	const pluralName = pluralize(entityName.toLowerCase());
	const titleField = inferTitleField(entity);
	const columns = generateTableColumns(entity);
	const listColumns = generateListColumns(entity);
	const detailFields = generateDetailFields(entity);
	const actionCommands = getActionCommands(entity, commands, schema);
	const booleanToggles = detectBooleanToggles(entity, actionCommands);
	const entityKey = entityName.toLowerCase();

	return {
		entityName,
		pluralName,
		titleField,
		columns,
		listColumns,
		detailFields,
		actionCommands,
		booleanToggles,
		entityKey,
	};
};
