/**
 * Fast-check arbitrary generation for mock data.
 */
import type { OperationDef } from "@morph/domain-schema";

type OutputTypeRef = OperationDef["output"];

/**
 * Check if an output type requires external arbitraries.
 * Returns true if the type needs arbitraries from the DSL package.
 */
export const outputRequiresArbitraries = (output: OutputTypeRef): boolean => {
	switch (output.kind) {
		case "array": {
			return outputRequiresArbitraries(output.element);
		}
		case "entity":
		case "entityId":
		case "generic":
		case "type":
		case "valueObject": {
			return true;
		}
		case "function":
		case "primitive":
		case "typeParam":
		case "union": {
			return false;
		}
		case "optional": {
			return outputRequiresArbitraries(output.inner);
		}
		default: {
			const _exhaustive: never = output;
			return _exhaustive;
		}
	}
};

/**
 * Map an output TypeRef to a fast-check arbitrary expression.
 * Uses named arbitraries from the DSL package for entities/value objects.
 */
export const outputToArbitrary = (output: OutputTypeRef): string => {
	switch (output.kind) {
		case "array": {
			return `fc.array(${outputToArbitrary(output.element)})`;
		}
		case "entity": {
			return `${output.name}Arbitrary`;
		}
		case "entityId": {
			return `${output.entity}IdArbitrary`;
		}
		case "function": {
			// Functions can't be meaningfully generated as arbitraries
			return "fc.constant(() => {})";
		}
		case "generic": {
			return `${output.name}Arbitrary`;
		}
		case "optional": {
			return `fc.option(${outputToArbitrary(output.inner)}, { nil: undefined })`;
		}
		case "primitive": {
			switch (output.name) {
				case "boolean": {
					return "fc.boolean()";
				}
				case "date": {
					return "fc.date()";
				}
				case "datetime": {
					return "fc.date()";
				}
				case "float": {
					return "fc.double()";
				}
				case "integer": {
					return "fc.bigInt()";
				}
				case "string": {
					return "fc.string()";
				}
				case "unknown": {
					return "fc.anything()";
				}
				case "void": {
					return "fc.constant(undefined)";
				}
			}
			// Exhaustive switch above, but satisfying no-fallthrough
			return "fc.string()";
		}
		case "type": {
			return `${output.name}Arbitrary`;
		}
		case "typeParam": {
			// Type params can't be instantiated to arbitraries - use unknown
			return "fc.anything()";
		}
		case "union": {
			const members = output.values
				.map((v) => `fc.constant("${v}" as const)`)
				.join(", ");
			return `fc.oneof(${members})`;
		}
		case "valueObject": {
			return `${output.name}Arbitrary`;
		}
		default: {
			const _exhaustive: never = output;
			return _exhaustive;
		}
	}
};

/**
 * Collect all arbitrary names needed for an output type.
 * Returns names that need to be imported from the DSL package.
 */
export const collectArbitraryImports = (
	output: OutputTypeRef,
): readonly string[] => {
	switch (output.kind) {
		case "array": {
			return collectArbitraryImports(output.element);
		}
		case "entity": {
			return [`${output.name}Arbitrary`];
		}
		case "entityId": {
			return [`${output.entity}IdArbitrary`];
		}
		case "function":
		case "primitive":
		case "typeParam":
		case "union": {
			return [];
		}
		case "generic": {
			// Include arbitrary for generic types like StepBuilder<T> -> StepBuilderArbitrary
			return [`${output.name}Arbitrary`];
		}
		case "optional": {
			return collectArbitraryImports(output.inner);
		}
		case "type": {
			return [`${output.name}Arbitrary`];
		}
		case "valueObject": {
			return [`${output.name}Arbitrary`];
		}
		default: {
			const _exhaustive: never = output;
			return _exhaustive;
		}
	}
};
