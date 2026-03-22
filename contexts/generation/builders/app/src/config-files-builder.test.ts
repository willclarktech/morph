import { describe, expect, test } from "bun:test";

import { buildCliConfigFiles, buildConfigFiles } from "./config-files-builder";

describe("buildConfigFiles", () => {
	test("generates eslint and tsconfig files", () => {
		const files = buildConfigFiles("apps/api", "todo-app");
		expect(files).toHaveLength(2);
		expect(files.map((f) => f.filename).sort()).toEqual([
			"apps/api/eslint.config.ts",
			"apps/api/tsconfig.json",
		]);
	});

	test("eslint config uses generated preset", () => {
		const files = buildConfigFiles("apps/api", "todo-app");
		const eslint = files.find((f) => f.filename.endsWith("eslint.config.ts"));
		expect(eslint!.content).toContain("configs.generated");
		expect(eslint!.content).toContain("@todo-app/eslint-config");
	});

	test("tsconfig extends base config with correct scope", () => {
		const files = buildConfigFiles("apps/api", "MyApp");
		const tsconfig = files.find((f) => f.filename.endsWith("tsconfig.json"));
		expect(tsconfig!.content).toContain("@myapp/tsconfig/base.json");
	});

	test("tsconfig includes src directory", () => {
		const files = buildConfigFiles("apps/api", "test");
		const tsconfig = files.find((f) => f.filename.endsWith("tsconfig.json"));
		expect(tsconfig!.content).toContain('"include": ["src"]');
	});
});

describe("buildCliConfigFiles", () => {
	test("generates eslint and tsconfig files", () => {
		const files = buildCliConfigFiles("apps/cli", "todo-app");
		expect(files).toHaveLength(2);
	});

	test("eslint config includes both generated and cli presets", () => {
		const files = buildCliConfigFiles("apps/cli", "todo-app");
		const eslint = files.find((f) => f.filename.endsWith("eslint.config.ts"));
		expect(eslint!.content).toContain("configs.generated");
		expect(eslint!.content).toContain("configs.cli");
	});

	test("tsconfig is same as standard config", () => {
		const standardFiles = buildConfigFiles("apps/cli", "test");
		const cliFiles = buildCliConfigFiles("apps/cli", "test");
		const standardTsconfig = standardFiles.find((f) =>
			f.filename.endsWith("tsconfig.json"),
		);
		const cliTsconfig = cliFiles.find((f) =>
			f.filename.endsWith("tsconfig.json"),
		);
		expect(cliTsconfig!.content).toBe(standardTsconfig!.content);
	});
});
