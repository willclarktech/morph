/**
 * Barrel and supporting file generation for invariants.
 */
import type { DomainSchema, GeneratedFile } from "@morph/domain-schema";

import { getAllInvariants } from "@morph/domain-schema";
import { toKebabCase } from "@morph/utils";

import { conditionReferencesCurrentUser } from "./inference";

/**
 * Generate the InvariantViolation error class.
 */
export const generateInvariantErrors = (): GeneratedFile => {
	const content = `// Generated invariant errors
// Do not edit - regenerate from schema

import { Data } from "effect";

/**
 * Error when an invariant is violated.
 */
export class InvariantViolation extends Data.TaggedError("InvariantViolation")<{
	readonly invariant: string;
	readonly message: string;
	readonly entity?: string;
	readonly entityId?: string;
}> {}
`;

	return { content, filename: "invariants/errors.ts" };
};

/**
 * Generate the InvariantContext interface.
 * This is the execution context passed to context-scoped invariants.
 */
export const generateInvariantContext = (): GeneratedFile => {
	const content = `// Generated invariant context type
// Do not edit - regenerate from schema

/**
 * Execution context for invariant validation.
 * Populated by the interpreter (CLI, API, etc.) at runtime.
 */
export interface InvariantContext<TUser = unknown> {
	/** The currently authenticated user, or undefined if not authenticated */
	readonly currentUser: TUser | undefined;
	/** Name of the operation being executed */
	readonly operationName: string;
	/** ISO timestamp of when the operation started */
	readonly timestamp: string;
	/** Loaded entities for entity-scoped invariants */
	readonly entities: Record<string, unknown>;
	/** Optional request ID for tracing */
	readonly requestId?: string;
}
`;

	return { content, filename: "invariants/context.ts" };
};

/**
 * Generate the invariants barrel export.
 */
export const generateInvariantsBarrel = (
	schema: DomainSchema,
): GeneratedFile | undefined => {
	const invariants = getAllInvariants(schema);

	if (invariants.length === 0) {
		return undefined;
	}

	// Include entity-scoped and context-scoped invariants
	const supportedInvariants = invariants.filter(
		(entry) =>
			entry.def.scope.kind === "entity" || entry.def.scope.kind === "context",
	);

	if (supportedInvariants.length === 0) {
		return undefined;
	}

	// Check if we need InvariantContext (context-scoped invariants OR entity-scoped with currentUser reference)
	const needsInvariantContext =
		supportedInvariants.some((entry) => entry.def.scope.kind === "context") ||
		supportedInvariants.some(
			(entry) =>
				entry.def.scope.kind === "entity" &&
				conditionReferencesCurrentUser(entry.def.condition),
		);

	const exports = supportedInvariants
		.map((entry) => `export * from "./${toKebabCase(entry.def.name)}";`)
		.toSorted()
		.join("\n");

	const contextExport = needsInvariantContext
		? `export * from "./context";\n`
		: "";

	const content = `// Generated invariants barrel
// Do not edit - regenerate from schema

${contextExport}export * from "./errors";
${exports}
`;

	return { content, filename: "invariants/index.ts" };
};
