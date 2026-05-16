// Template for implementing the function.
// Copy to your impls package and implement the logic.
import type { DslDiagnostic } from "@morphdsl/schema-dsl-dsl";

/**
 * Implementation of getDiagnostics function.
 * Get diagnostics (errors and warnings) for a .morph source file
 */
export const getDiagnostics = (
	params: { readonly source: string },
	_options: Record<string, never>,
): readonly DslDiagnostic[] => {
	// Params: source
	// TODO: Implement getDiagnostics
	return {} as readonly DslDiagnostic[];
};
