/**
 * Generate errors section.
 */
import type { DomainSchema, ErrorWithOperation } from "@morph/domain-schema";

import { getAllErrors } from "@morph/domain-schema";

import { code, heading, table } from "../markdown";

/**
 * Options for generating errors section.
 */
export interface ErrorsOptions {
	/**
	 * Heading level for the section (default: 2).
	 */
	readonly headingLevel?: 2 | 3;
}

/**
 * Generate the errors section.
 */
export const errors = (
	schema: DomainSchema,
	options: ErrorsOptions = {},
): string => {
	const allErrors = getAllErrors(schema);

	if (allErrors.length === 0) return "";

	const level = options.headingLevel ?? 2;
	const lines: string[] = [heading(level, "Errors")];

	const errorRows = allErrors.map((error: ErrorWithOperation) => [
		code(`${error.name}Error`),
		error.description,
	]);

	lines.push(table(["Error", "Description"], errorRows));

	return lines.join("\n\n");
};

/**
 * Generate errors section from pre-extracted data.
 * Use this when you already have the errors list.
 */
export const errorsFromData = (
	allErrors: readonly ErrorWithOperation[],
	options: ErrorsOptions = {},
): string => {
	if (allErrors.length === 0) return "";

	const level = options.headingLevel ?? 2;
	const lines: string[] = [heading(level, "Errors")];

	const errorRows = allErrors.map((error: ErrorWithOperation) => [
		code(`${error.name}Error`),
		error.description,
	]);

	lines.push(table(["Error", "Description"], errorRows));

	return lines.join("\n\n");
};
