import type { DomainSchema } from "@morphdsl/domain-schema";

import { getAllFunctions, getAllOperations } from "@morphdsl/domain-schema";

export const schemaHasTag = (schema: DomainSchema, tag: string): boolean =>
	getAllOperations(schema).some((entry) => entry.def.tags.includes(tag)) ||
	getAllFunctions(schema).some((entry) => entry.def.tags.includes(tag));
