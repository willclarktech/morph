/**
 * Generate the shared errors file for repository services.
 */

import type { GeneratedFile } from "@morph/domain-schema";

export const generateErrorsFile = (): GeneratedFile => {
	const content = `// Generated service errors
// Do not edit - regenerate from schema

import { Data } from "effect";

/**
 * General repository error for persistence failures.
 */
export class RepositoryError extends Data.TaggedError("RepositoryError")<{
	readonly cause?: unknown;
	readonly message: string;
}> {}

/**
 * Entity not found error.
 */
export class NotFoundError extends Data.TaggedError("NotFoundError")<{
	readonly entity: string;
	readonly id: string;
}> {}

/**
 * Union of all repository error types.
 */
export type RepositoryServiceError = NotFoundError | RepositoryError;
`;

	return { content, filename: "services/errors.ts" };
};
