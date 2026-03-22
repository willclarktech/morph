import type { PluginContext } from "@morph/plugin";

import {
	contextNameToKebab,
	getContextErrorsForContext,
	getEntitiesForContext,
	getFunctionsForContext,
	getOperationsForContext,
	getPortsForContext,
	getTypesForContext,
	getValueObjectsForContext,
} from "@morph/domain-schema";

export interface ContextPackageInfo {
	readonly contextName: string;
	readonly hasArbitraries: boolean;
	readonly hasErrors: boolean;
	readonly hasFunctions: boolean;
	readonly hasOperations: boolean;
	readonly hasPorts: boolean;
	readonly hasTypes: boolean;
	readonly kebabName: string;
	readonly packageName: string;
}

export const toPackageScope = (name: string): string => name.toLowerCase();

export const getContextPackageInfo = (
	ctx: PluginContext,
	contextName: string,
): ContextPackageInfo => {
	const { schema, name } = ctx;
	const kebabName = contextNameToKebab(contextName);
	const scope = toPackageScope(name);

	const errors = getContextErrorsForContext(schema, contextName);
	const ports = getPortsForContext(schema, contextName);
	const types = getTypesForContext(schema, contextName);
	const functions = getFunctionsForContext(schema, contextName);
	const operations = getOperationsForContext(schema, contextName);
	const entities = getEntitiesForContext(schema, contextName);
	const valueObjects = getValueObjectsForContext(schema, contextName);

	return {
		contextName,
		hasArbitraries: entities.length > 0 || valueObjects.length > 0,
		hasErrors:
			errors.length > 0 ||
			functions.some((f) => f.def.errors.length > 0) ||
			operations.some((op) => op.def.errors.length > 0),
		hasFunctions: functions.length > 0 || operations.length > 0,
		hasOperations: operations.length > 0,
		hasPorts: ports.length > 0,
		hasTypes: types.length > 0 || entities.length > 0 || valueObjects.length > 0,
		kebabName,
		packageName: `@${scope}/${kebabName}-dsl`,
	};
};

export const generateContextIndex = (
	info: ContextPackageInfo,
	depContexts: readonly string[],
): string => {
	const lines = [
		`// Generated DSL package for context: ${info.contextName}`,
		"// Do not edit manually",
		"",
	];

	if (info.hasTypes) {
		lines.push("// Type schemas");
		lines.push('export * from "./schemas";');
		lines.push("");
	}

	if (info.hasErrors) {
		lines.push("// Domain errors");
		lines.push('export * from "./errors";');
		lines.push("");
	}

	if (info.hasPorts) {
		lines.push("// Ports (DI contracts)");
		lines.push('export * from "./ports";');
		lines.push("");
	}

	if (info.hasOperations) {
		lines.push("// DSL operations");
		lines.push(`export * from "./${info.contextName}";`);
		lines.push("");
	}

	if (info.hasArbitraries) {
		lines.push("// Arbitraries for property testing and mocks");
		lines.push('export * from "./arbitraries";');
		lines.push("");
	}

	return lines.join("\n");
};
