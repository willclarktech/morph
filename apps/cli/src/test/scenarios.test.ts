import { prose as GenerationProse } from "@morph/generation-core";
import { createCliRunner } from "@morph/scenario-runner-cli";
import { scenarios } from "@morph/scenarios";
import { prose as SchemaDslProse } from "@morph/schema-dsl-core";
import { expect, test } from "bun:test";
import path from "node:path";

const prose = {
	...GenerationProse,
	...SchemaDslProse,
};

// Resolve to package root (test file is in src/test/)
const cwd = path.resolve(import.meta.dir, "../..");

const runner = createCliRunner({
	appName: "Morph",
	command: "bun src/index.ts",
	cwd,
	dataFile: "/tmp/Morph-test-data.json",
	optionNames: {},
	paramOrder: {},
	prose,
	storage: "jsonfile",
});

test("scenarios", async () => {
	const result = await runner.runAllAndPrint(scenarios);
	expect(result.failed).toBe(0);
});
