// Template for implementing the function.
// Copy to your impls package and implement the logic.
import type { DslLocation } from "@morphdsl/schema-dsl-dsl";

/**
 * Implementation of getDefinition function.
 * Get go-to-definition location for a symbol at a position in a .morph source file
 */
export const getDefinition = (
	params: {
		readonly column: number;
		readonly line: number;
		readonly source: string;
	},
	_options: Record<string, never>,
): DslLocation => {
	// Params: column, line, source
	// TODO: Implement getDefinition
	return {} as DslLocation;
};
