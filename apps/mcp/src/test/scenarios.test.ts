import { createMcpRunner } from "@morph/scenario-runner-mcp";
import { prose as GenerationProse } from "@morph/generation-core";
import { prose as SchemaDslProse } from "@morph/schema-dsl-core";
import { scenarios } from "@morph/scenarios";
import { expect, test } from "bun:test";
import path from "node:path";

const prose = {
	...GenerationProse,
	...SchemaDslProse,
};

// Resolve to package root (test file is in src/test/)
const cwd = path.resolve(import.meta.dir, "../..");

const runner = createMcpRunner({
	command: "bun src/index.ts",
	cwd,
	env: { MORPH_STORAGE: "memory" },
	prose,
	reset: "restart",
});

test("scenarios", async () => {
	const result = await runner.runAllAndPrint(scenarios);
	expect(result.failed).toBe(0);
});
