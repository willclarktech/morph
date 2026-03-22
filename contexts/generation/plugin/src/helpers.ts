import type { DomainSchema } from "@morph/domain-schema";

import { getAllFunctions, getAllOperations } from "@morph/domain-schema";

export const schemaHasTag = (schema: DomainSchema, tag: string): boolean =>
	getAllOperations(schema).some((entry) => entry.def.tags.includes(tag)) ||
	getAllFunctions(schema).some((entry) => entry.def.tags.includes(tag));
