import type { DomainSchema } from "@morph/domain-schema";
import { schemaHasAuthRequirement } from "@morph/domain-schema";
import { buildTokenAuthConfig } from "@morph/builder-test";
import { sortImports } from "@morph/utils";

export const generateClientScenarioTest = (
	schema: DomainSchema,
	scenariosPackage: string,
	corePackage: string,
): string => {
	const hasAuth = schemaHasAuthRequirement(schema);
	const authConfig = buildTokenAuthConfig(hasAuth);

	const imports = sortImports(
		[
			`import { createClientRunner } from "@morph/scenario-runner-client";`,
			`import { createClient } from "../client";`,
			`import { prose } from "${corePackage}";`,
			`import { scenarios } from "${scenariosPackage}";`,
			`import { expect, test } from "bun:test";`,
			`import path from "node:path";`,
		].join("\n"),
	);

	return `${imports}

// Resolve to API package root (client lib is in libs/client/src/test/)
const apiCwd = path.resolve(import.meta.dir, "../../../../apps/api");

const runner = createClientRunner({
	${authConfig}createClient,
	prose,
	reset: "restart",
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
