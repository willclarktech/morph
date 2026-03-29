import { parseSchema } from "@morphdsl/domain-schema";

import schemaJson from "../../../../schema-resolved.json";

/**
 * Morph domain schema.
 * Parsed and validated at import time using Effect Schema.
 */
export const morphSchema = parseSchema(schemaJson);
