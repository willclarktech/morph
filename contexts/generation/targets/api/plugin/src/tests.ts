import type { DomainSchema } from "@morph/domain-schema";
import {
	getAllOperations,
	schemaHasAuthRequirement,
} from "@morph/domain-schema";
import { buildTokenAuthConfig } from "@morph/builder-test";
import { indent } from "@morph/utils";

export const generateApiScenarioTest = (
	schema: DomainSchema,
	scenariosPackage: string,
	dslPackage: string,
	corePackage: string,
): string => {
	const allOperations = getAllOperations(schema);
	const opNames = allOperations.map((op) => op.name);
	const hasAuth = schemaHasAuthRequirement(schema);
	const schemaExportName = `${schema.name.toLowerCase()}Schema`;
	const operationsMap = indent(opNames.map((n) => `${n}: ops.${n},`).join("\n"), 2);
	const authConfig = buildTokenAuthConfig(hasAuth);

	return `import { createApiRunner } from "@morph/scenario-runner-api";
import { ops, prose } from "${corePackage}";
import { ${schemaExportName} } from "${dslPackage}";
import { scenarios } from "${scenariosPackage}";
import { expect, test } from "bun:test";
import path from "node:path";

// Resolve to package root (test file is in src/test/)
const cwd = path.resolve(import.meta.dir, "../..");

const runner = createApiRunner({
	${authConfig}operations: {
${operationsMap}
	},
	prose,
	reset: "restart",
	schema: ${schemaExportName},
	server: {
		command: "bun src/index.ts",
		cwd,
		port: 0,
	},
});

test("scenarios", async () => {
	const result = await runner.runAllAndPrint(scenarios);
	expect(result.failed).toBe(0);
});
`;
};
