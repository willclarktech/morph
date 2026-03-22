/**
 * IdGenerator service generators.
 */

import type { GeneratedFile } from "@morph/domain-schema";

/**
 * Generate the IdGenerator service interface.
 */
export const generateIdGeneratorService = (
	projectName = "app",
): GeneratedFile => {
	const content = `// Generated IdGenerator service interface
// Do not edit - regenerate from schema

import { Context, Effect } from "effect";

/**
 * Service for generating unique identifiers.
 */
export interface IdGenerator {
	readonly generate: () => Effect.Effect<string>;
}

/**
 * Context tag for IdGenerator dependency injection.
 */
export const IdGenerator = Context.GenericTag<IdGenerator>("@${projectName}/IdGenerator");
`;

	return { content, filename: "services/id-generator.ts" };
};

/**
 * Generate the UUID implementation of IdGenerator.
 */
export const generateIdGeneratorUUID = (): GeneratedFile => {
	const content = `// Generated UUID IdGenerator implementation
// Do not edit - regenerate from schema

import { randomUUID } from "node:crypto";

import { Effect, Layer } from "effect";

import { IdGenerator } from "./id-generator";

/**
 * UUID implementation using crypto.randomUUID().
 */
export const IdGeneratorUUID: Layer.Layer<IdGenerator> = Layer.succeed(
	IdGenerator,
	{ generate: () => Effect.sync(() => randomUUID()) },
);
`;

	return { content, filename: "services/id-generator-uuid.ts" };
};
