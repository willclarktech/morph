// Template for implementing the function.
// Copy to your impls package and implement the logic.
import type { DslSymbol } from "@morphdsl/schema-dsl-dsl";

/**
 * Implementation of getSymbols function.
 * Get document symbols (outline) for a .morph source file
 */
export const getSymbols = (
	params: { readonly source: string },
	_options: Record<string, never>,
): readonly DslSymbol[] => {
	// Params: source
	// TODO: Implement getSymbols
	return {} as readonly DslSymbol[];
};
