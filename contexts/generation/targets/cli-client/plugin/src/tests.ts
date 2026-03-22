import type { DomainSchema } from "@morph/domain-schema";
import {
	getAllOperations,
	getInjectableParams,
} from "@morph/domain-schema";
import {
	buildTokenAuthConfig,
	getOptionNames,
	getParamNames,
	getSensitiveNames,
} from "@morph/builder-test";
import { indent, toEnvironmentPrefix, toKebabCase } from "@morph/utils";

export const generateClientCliScenarioTest = (
	schema: DomainSchema,
	name: string,
	scenariosPackage: string,
	corePackage: string,
	hasAuth: boolean,
): string => {
	const authConfig = buildTokenAuthConfig(hasAuth);

	const allOperations = getAllOperations(schema).filter((op) =>
		op.def.tags.includes("@cli-client"),
	);

	const parameterOrderEntries = indent(
		allOperations
			.map((op) => {
				const injectable = new Set(
					getInjectableParams(schema, op.name).map((p) => p.paramName),
				);
				const names = getParamNames(op).filter((n) => !injectable.has(n));
				return `"${toKebabCase(op.name)}": ${JSON.stringify(names)},`;
			})
			.join("\n"),
		2,
	);

	const optionNamesEntries = indent(
		allOperations
			.map((op) => {
				const injectable = new Set(
					getInjectableParams(schema, op.name).map((p) => p.paramName),
				);
				const names = getOptionNames(op).filter((n) => !injectable.has(n));
				return `"${toKebabCase(op.name)}": ${JSON.stringify(names)},`;
			})
			.join("\n"),
		2,
	);

	const envPrefix = toEnvironmentPrefix(`${name}-client`);

	const sensitiveParametersEntries = indent(
		allOperations
			.map((op) => {
				const injectable = new Set(
					getInjectableParams(schema, op.name).map((p) => p.paramName),
				);
				const names = getSensitiveNames(op).filter((n) => !injectable.has(n));
				if (names.length === 0) return undefined;
				return `"${toKebabCase(op.name)}": ${JSON.stringify(names)},`;
			})
			.filter(Boolean)
			.join("\n"),
		2,
	);

	const sensitiveConfig = sensitiveParametersEntries
		? `\n\tsensitiveParams: {\n${sensitiveParametersEntries}\n\t},`
		: "";

	return `import { createClientCliRunner } from "@morph/scenario-runner-cli-client";
import { prose } from "${corePackage}";
import { scenarios } from "${scenariosPackage}";
import { expect, test } from "bun:test";
import path from "node:path";

// Resolve paths relative to test file location
const cliClientCwd = path.resolve(import.meta.dir, "../..");
const apiCwd = path.resolve(import.meta.dir, "../../../../apps/api");

const runner = createClientCliRunner({
	${authConfig}command: "bun src/index.ts",
	cwd: cliClientCwd,
	envPrefix: "${envPrefix}",
	optionNames: {
${optionNamesEntries}
	},
	paramOrder: {
${parameterOrderEntries}
	},
	prose,${sensitiveConfig}
	server: {
		command: "bun src/index.ts",
		cwd: apiCwd,
		port: 0,
	},
});

test("scenarios", async () => {
	const result = await runner.runAllAndPrint(scenarios);
	expect(result.failed).toBe(0);
});
`;
};
