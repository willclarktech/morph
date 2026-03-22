/**
 * Generate property-based tests from schema invariants.
 *
 * Property tests verify that validators respect invariants across random inputs.
 * Uses fast-check arbitraries derived from Effect Schemas.
 *
 * Conceptually:
 * - Invariants (∀): Universal laws that must hold for ALL inputs
 * - Property tests: Verify invariants via random sampling
 * - Guards (validators): Runtime enforcement of the same laws
 */

import type { DomainSchema, GeneratedFile } from "@morph/domain-schema";

import { getAllInvariants } from "@morph/domain-schema";

import { generateContextPropertyTest } from "./context-property-test";
import { generateEntityPropertyTest } from "./entity-property-test";

/**
 * Generate property tests for all invariants in a schema.
 */
export const generatePropertyTests = (
	schema: DomainSchema,
	options: {
		readonly arbitrariesImportPath?: string;
		readonly coreImportPath?: string;
	} = {},
): GeneratedFile | undefined => {
	const invariants = getAllInvariants(schema);

	// Filter to supported scope types
	const supportedInvariants = invariants.filter(
		(entry) =>
			entry.def.scope.kind === "entity" || entry.def.scope.kind === "context",
	);

	if (supportedInvariants.length === 0) {
		return undefined;
	}

	const arbitrariesPath = options.arbitrariesImportPath ?? "../src/arbitraries";
	const corePath = options.coreImportPath ?? "../src";

	// Generate tests and collect imports
	const allArbitraryImports = new Set<string>();
	const allValidatorImports = new Set<string>();
	const testCodes: string[] = [];
	let needsInvariantContext = false;

	for (const entry of supportedInvariants) {
		const invariant = entry.def;

		if (invariant.scope.kind === "entity") {
			const result = generateEntityPropertyTest(
				invariant,
				invariant.scope.entity,
			);
			for (const imp of result.arbitraryImports) allArbitraryImports.add(imp);
			allValidatorImports.add(result.validatorImport);
			testCodes.push(result.code);
		} else if (invariant.scope.kind === "context") {
			const result = generateContextPropertyTest(invariant);
			for (const imp of result.arbitraryImports) allArbitraryImports.add(imp);
			allValidatorImports.add(result.validatorImport);
			testCodes.push(result.code);
			needsInvariantContext = true;
		}
	}

	const arbitraryImportsArray = [...allArbitraryImports].toSorted();
	const validatorImportsArray = [...allValidatorImports].toSorted();

	const content = `// Generated property tests from invariants
// Do not edit - regenerate from schema
//
// These tests verify that validators respect invariants across random inputs.
// Invariants are universal laws (∀) - property tests sample the input space.

import { test } from "bun:test";
import { Effect } from "effect";
import * as fc from "fast-check";

import { ${arbitraryImportsArray.join(", ")} } from "${arbitrariesPath}";
import { ${validatorImportsArray.join(", ")}${needsInvariantContext ? ", InvariantContext" : ""} } from "${corePath}";
${testCodes.join("\n")}
`;

	return { content, filename: "src/invariants.property.test.ts" };
};
