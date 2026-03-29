import type { DomainSchema } from "@morphdsl/domain-schema";
import { getAllOperations } from "@morphdsl/domain-schema";
import {
	buildCredentialAuthConfig,
	getOptionNames,
	getParamNames,
	getSensitiveNames,
} from "@morphdsl/builder-test";
import { indent, sortImports, toKebabCase, toPascalCase } from "@morphdsl/utils";
import { schemaHasAuthRequirement } from "@morphdsl/domain-schema";

interface ContextPackages {
	readonly contextName: string;
	readonly corePackage: string;
	readonly dslPackage: string;
}

export const generateCliScenarioTest = (
	schema: DomainSchema,
	name: string,
	scenariosPackage: string,
	contexts: readonly ContextPackages[],
): string => {
	const allOperations = getAllOperations(schema);
	const hasAuth = schemaHasAuthRequirement(schema);
	const usePrefix = contexts.length > 1;

	const toCommandKey = (op: { readonly context: string; readonly name: string }): string =>
		usePrefix
			? `${toKebabCase(op.context)}:${toKebabCase(op.name)}`
			: toKebabCase(op.name);

	const parameterOrderEntries = indent(
		allOperations
			.map((op) => {
				const names = getParamNames(op);
				return `"${toCommandKey(op)}": ${JSON.stringify(names)},`;
			})
			.join("\n"),
		2,
	);

	const optionNamesEntries = indent(
		allOperations
			.map((op) => {
				const names = getOptionNames(op);
				return `"${toCommandKey(op)}": ${JSON.stringify(names)},`;
			})
			.join("\n"),
		2,
	);

	const sensitiveParametersEntries = indent(
		allOperations
			.map((op) => {
				const names = getSensitiveNames(op);
				if (names.length === 0) return undefined;
				return `"${toCommandKey(op)}": ${JSON.stringify(names)},`;
			})
			.filter(Boolean)
			.join("\n"),
		2,
	);

	const authConfig = buildCredentialAuthConfig(name, hasAuth);
	const sensitiveConfig = sensitiveParametersEntries
		? `\n\tsensitiveParams: {\n${sensitiveParametersEntries}\n\t},`
		: "";

	const proseImports = contexts
		.map((ctx) => {
			const alias = `${toPascalCase(ctx.contextName)}Prose`;
			return `import { prose as ${alias} } from "${ctx.corePackage}";`;
		})
		.join("\n");

	const proseMerge =
		contexts.length === 1
			? `const prose = ${toPascalCase(contexts[0]!.contextName)}Prose;`
			: `const prose = {\n${contexts.map((ctx) => `\t...${toPascalCase(ctx.contextName)}Prose,`).join("\n")}\n};`;

	const imports = sortImports(
		[
			`import { createCliRunner } from "@morphdsl/scenario-runner-cli";`,
			proseImports,
			`import { scenarios } from "${scenariosPackage}";`,
			`import { expect, test } from "bun:test";`,
			`import path from "node:path";`,
		].join("\n"),
	);

	return `${imports}

${proseMerge}

// Resolve to package root (test file is in src/test/)
const cwd = path.resolve(import.meta.dir, "../..");

const runner = createCliRunner({${authConfig}
	command: "bun src/index.ts",
	cwd,
	dataFile: "/tmp/${name}-test-data.json",
	optionNames: {
${optionNamesEntries}
	},
	paramOrder: {
${parameterOrderEntries}
	},
	prose,${sensitiveConfig}
	storage: "jsonfile",
});

test("scenarios", async () => {
	const result = await runner.runAllAndPrint(scenarios);
	expect(result.failed).toBe(0);
});
`;
};

export const generateCliPropertyTest = (
	schema: DomainSchema,
	name: string,
	propertiesPackage: string,
): string => {
	const allOperations = getAllOperations(schema);

	const parameterOrderEntries = allOperations
		.map((op) => {
			const names = getParamNames(op);
			return `\t"${toKebabCase(op.name)}": ${JSON.stringify(names)},`;
		})
		.join("\n");

	const optionNamesEntries = allOperations
		.map((op) => {
			const names = getOptionNames(op);
			return `\t"${toKebabCase(op.name)}": ${JSON.stringify(names)},`;
		})
		.join("\n");

	return `import { createPropertyCliRunner } from "@morphdsl/property-runner-cli";
import { validatorProperties } from "${propertiesPackage}";
import { expect, test } from "bun:test";
import path from "node:path";

// Resolve to package root (test file is in src/test/)
const cwd = path.resolve(import.meta.dir, "../..");

const runner = createPropertyCliRunner({
	appName: "${name}",
	command: "bun src/index.ts",
	cwd,
	dataFile: "/tmp/${name}-property-test-data.json",
	optionNames: {
${optionNamesEntries}
	},
	paramOrder: {
${parameterOrderEntries}
	},
	storage: "jsonfile",
});

test("validator properties", async () => {
	// Note: Validator properties are skipped for CLI runner
	// (validators are internal to the library, not exposed via CLI)
	const result = await runner.runAllAndPrint(validatorProperties);
	expect(result.failed).toBe(0);
});
`;
};
