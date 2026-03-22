import type { DomainSchema } from "@morph/domain-schema";

import {
	getAllEntities,
	getAllTypes,
	getAllValueObjects,
	getCommandsWithEvents,
	getEntitiesForContext,
	getTypesForContext,
	getValueObjectsForContext,
} from "@morph/domain-schema";

import { generateEntitySchema, generateEventSchema } from "./entity-schema";
import { generateFunctionSchemas } from "./functions";
import { generateTypeSchemas } from "./types";
import { generateValueObjectSchema } from "./value-schema";

export interface GenerateSchemasOptions {
	readonly contextName?: string | undefined;
	readonly externalTypesPackage?: string | undefined;
}

export const generateSchemas = (
	schema: DomainSchema,
	options: GenerateSchemasOptions = {},
): string => {
	const allEntities = options.contextName
		? getEntitiesForContext(schema, options.contextName)
		: getAllEntities(schema);
	const allValueObjects = options.contextName
		? getValueObjectsForContext(schema, options.contextName)
		: getAllValueObjects(schema);
	const allTypes = options.contextName
		? getTypesForContext(schema, options.contextName)
		: getAllTypes(schema);
	const allCommandsWithEvents = options.contextName
		? getCommandsWithEvents(schema).filter(
				(cmd) => cmd.context === options.contextName,
			)
		: getCommandsWithEvents(schema);

	const entities = allEntities.map((entry) => [entry.name, entry.def] as const);
	const valueObjects = allValueObjects.map(
		(entry) => [entry.name, entry.def] as const,
	);
	const types = allTypes;
	const commandsWithEvents = allCommandsWithEvents;

	const typeSchemas =
		types.length > 0
			? generateTypeSchemas(schema, { contextName: options.contextName })
			: "";
	const functionSchemas = generateFunctionSchemas(schema, {
		contextName: options.contextName,
		externalTypesPackage: options.externalTypesPackage,
	});

	if (
		entities.length === 0 &&
		valueObjects.length === 0 &&
		commandsWithEvents.length === 0 &&
		types.length === 0 &&
		functionSchemas === ""
	) {
		return "";
	}

	const imports = 'import * as S from "effect/Schema";';

	const uuidPattern = `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`;

	const uncapitalize = (s: string): string =>
		s.charAt(0).toLowerCase() + s.slice(1);

	const idSections = entities.map(([name]) => {
		const idType = `${name}Id`;
		const constructorName = uncapitalize(name) + "Id";
		return [
			`export const ${idType}Schema = S.String.pipe(S.pattern(${uuidPattern}), S.brand("${idType}"));`,
			`export type ${idType} = S.Schema.Type<typeof ${idType}Schema>;`,
			`export const ${constructorName} = (id: string): ${idType} => id as ${idType};`,
		].join("\n");
	});

	const entitySchemas = entities.map(([name, entity]) =>
		generateEntitySchema(name, entity),
	);

	const valueObjectSchemas = valueObjects.map(([name, vo]) =>
		generateValueObjectSchema(name, vo),
	);

	const eventSchemas = commandsWithEvents.flatMap((cmdEvent) =>
		cmdEvent.events.map((event) =>
			generateEventSchema(cmdEvent.commandName, cmdEvent.command, event),
		),
	);

	const domainEventBase =
		commandsWithEvents.length > 0
			? [
					"// Base event interface",
					"export interface DomainEvent {",
					"\treadonly _tag: string;",
					"\treadonly aggregateId: string;",
					"\treadonly occurredAt: string;",
					"\treadonly params: unknown;",
					"\treadonly result: unknown;",
					"\treadonly version: number;",
					"}",
				]
			: [];

	const sections = [
		"// Effect/Schema Definitions",
		"",
		imports,
		...(idSections.length > 0 ? ["", "// Branded IDs", "", ...idSections] : []),
		...(valueObjectSchemas.length > 0
			? ["", "// Value Object Schemas", "", ...valueObjectSchemas]
			: []),
		...(entitySchemas.length > 0
			? ["", "// Entity Schemas", "", ...entitySchemas]
			: []),
		...(typeSchemas === "" ? [] : ["", typeSchemas]),
		...(functionSchemas === "" ? [] : ["", functionSchemas]),
		...(domainEventBase.length > 0
			? ["", ...domainEventBase, "", ...eventSchemas]
			: []),
	];

	return sections.join("\n") + "\n";
};
