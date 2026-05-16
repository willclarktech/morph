// Template for implementing the function.
// Copy to your impls package and implement the logic.
import type { DslCompletion } from "@morphdsl/schema-dsl-dsl";

/**
 * Implementation of getCompletions function.
 * Get context-aware completions at a position in a .morph source file
 */
export const getCompletions = (
	params: {
		readonly column: number;
		readonly line: number;
		readonly source: string;
	},
	_options: Record<string, never>,
): readonly DslCompletion[] => {
	// Params: column, line, source
	// TODO: Implement getCompletions
	return {} as readonly DslCompletion[];
};
