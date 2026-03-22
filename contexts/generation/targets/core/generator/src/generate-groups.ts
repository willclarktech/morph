/**
 * File group generation helpers for operations.
 */
import type { DomainSchema, GeneratedFile } from "@morph/domain-schema";

import {
	conditionReferencesCurrentUser,
	getAllInvariants,
} from "@morph/domain-schema";

import {
	generateFunctionHandlerImplTemplates,
	generateHandlerImplTemplates,
	generateInvariantContext,
	generateInvariantErrors,
	generateInvariantsBarrel,
	generateInvariantValidators,
	generateLayerSelector,
	generateMockFunctionHandlerImpls,
	generateMockHandlerImpls,
	generateMockHandlersLayer,
	generateSubscriberImpls,
} from "./generators";

/**
 * Generate handler implementation templates.
 * These are NOT imported by the core package - they're reference files
 * for users to copy to their impls packages.
 */
export const generateImplTemplateFiles = (
	schema: DomainSchema,
	typesPath: string,
	prefix: string,
): readonly GeneratedFile[] => {
	const operationTemplates = generateHandlerImplTemplates(
		schema,
		typesPath,
	).map((file) => ({
		...file,
		filename: `${prefix}${file.filename}`,
	}));

	const functionTemplates = generateFunctionHandlerImplTemplates(
		schema,
		typesPath,
	).map((file) => ({
		...file,
		filename: `${prefix}${file.filename}`,
	}));

	return [...operationTemplates, ...functionTemplates];
};

/**
 * Generate mock handler implementations.
 */
export const generateMockFiles = (
	schema: DomainSchema,
	typesPath: string,
	prefix: string,
): readonly GeneratedFile[] => {
	const operationMocks = generateMockHandlerImpls(schema, typesPath).map(
		(file) => ({
			...file,
			filename: `${prefix}${file.filename}`,
		}),
	);

	const functionMocks = generateMockFunctionHandlerImpls(schema, typesPath).map(
		(file) => ({
			...file,
			filename: `${prefix}${file.filename}`,
		}),
	);

	const mockHandlersLayer = generateMockHandlersLayer(schema);

	return [
		...operationMocks,
		...functionMocks,
		{
			...mockHandlersLayer,
			filename: `${prefix}${mockHandlersLayer.filename}`,
		},
	];
};

/**
 * Generate subscriber implementation scaffolds.
 */
export const generateSubscriberFiles = (
	schema: DomainSchema,
	prefix: string,
): readonly GeneratedFile[] => {
	return generateSubscriberImpls(schema).map((file) => ({
		...file,
		filename: `${prefix}${file.filename}`,
	}));
};

/**
 * Generate layer selector file.
 */
export const generateLayerSelectorFile = (
	envPrefix: string,
	prefix: string,
): GeneratedFile => {
	const selector = generateLayerSelector(envPrefix);
	return {
		...selector,
		filename: `${prefix}${selector.filename}`,
	};
};

/**
 * Generate invariant validator files.
 */
export const generateInvariantFiles = (
	schema: DomainSchema,
	typesPath: string,
	prefix: string,
): readonly GeneratedFile[] => {
	const validatorFiles = generateInvariantValidators(schema, typesPath).map(
		(file) => ({
			...file,
			filename: `${prefix}${file.filename}`,
		}),
	);

	if (validatorFiles.length === 0) {
		return [];
	}

	// Check if we need InvariantContext
	const allInvariants = getAllInvariants(schema);
	const needsInvariantContext =
		allInvariants.some((entry) => entry.def.scope.kind === "context") ||
		allInvariants.some(
			(entry) =>
				entry.def.scope.kind === "entity" &&
				conditionReferencesCurrentUser(entry.def.condition),
		);

	const files: GeneratedFile[] = [
		{
			...generateInvariantErrors(),
			filename: `${prefix}invariants/errors.ts`,
		},
	];

	if (needsInvariantContext) {
		files.push({
			...generateInvariantContext(),
			filename: `${prefix}invariants/context.ts`,
		});
	}

	files.push(...validatorFiles);

	const barrel = generateInvariantsBarrel(schema);
	if (barrel) {
		files.push({
			...barrel,
			filename: `${prefix}${barrel.filename}`,
		});
	}

	return files;
};
