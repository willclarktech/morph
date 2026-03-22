import type { DomainSchema } from "@morph/domain-schema";

import {
	findPrimaryContext,
	getAllEntities,
	getCommandsWithEvents,
	hasPropertyTests,
	schemaHasAuthRequirement,
} from "@morph/domain-schema";

export interface SchemaFeatures {
	readonly hasAuth: boolean;
	readonly hasEntities: boolean;
	readonly hasEvents: boolean;
	readonly hasPropertyTests: boolean;
	readonly primaryContext: string | undefined;
}

export const analyzeSchemaFeatures = (
	schema: DomainSchema,
): SchemaFeatures => ({
	hasAuth: schemaHasAuthRequirement(schema),
	hasEntities: getAllEntities(schema).length > 0,
	hasEvents: getCommandsWithEvents(schema).length > 0,
	hasPropertyTests: hasPropertyTests(schema),
	primaryContext: findPrimaryContext(schema),
});
