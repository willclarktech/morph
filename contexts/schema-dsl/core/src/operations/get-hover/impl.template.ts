// Template for implementing the function.
// Copy to your impls package and implement the logic.
import type { DslHoverResult } from "@morphdsl/schema-dsl-dsl";

/**
 * Implementation of getHover function.
 * Get hover information at a position in a .morph source file
 */
export const getHover = (
	params: {
		readonly column: number;
		readonly line: number;
		readonly source: string;
	},
	_options: Record<string, never>,
): DslHoverResult => {
	// Params: column, line, source
	// TODO: Implement getHover
	return {} as DslHoverResult;
};
