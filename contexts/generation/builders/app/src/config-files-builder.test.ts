import { describe, expect, test } from "bun:test";

import { buildCliConfigFiles, buildConfigFiles } from "./config-files-builder";

describe("buildConfigFiles", () => {
	test("generates eslint and tsconfig files", () => {
		const files = buildConfigFiles({ packagePath: "apps/api", name: "todo" });
		expect(files).toHaveLength(2);
		expect(files.map((f) => f.filename).sort()).toEqual([
			"apps/api/eslint.config.ts",
			"apps/api/tsconfig.json",
		]);
	});

	test("eslint config uses generated preset", () => {
		const files = buildConfigFiles({ packagePath: "apps/api", name: "todo" });
		const eslint = files.find((f) => f.filename.endsWith("eslint.config.ts"));
		expect(eslint!.content).toContain("configs.generated");
		expect(eslint!.content).toContain("@todo/eslint-config");
	});

	test("tsconfig extends base config with correct scope", () => {
		const files = buildConfigFiles({ packagePath: "apps/api", name: "MyApp" });
		const tsconfig = files.find((f) => f.filename.endsWith("tsconfig.json"));
		expect(tsconfig!.content).toContain("@my-app/tsconfig/base.json");
	});

	test("tsconfig includes src directory", () => {
		const files = buildConfigFiles({ packagePath: "apps/api", name: "test" });
		const tsconfig = files.find((f) => f.filename.endsWith("tsconfig.json"));
		expect(tsconfig!.content).toContain('"include": ["src"]');
	});

	test("publishable generates tsconfig.build.json", () => {
		const files = buildConfigFiles({
			packagePath: "libs/core",
			name: "todo",
			publishable: true,
		});
		expect(files).toHaveLength(3);
		const buildTsconfig = files.find((f) =>
			f.filename.endsWith("tsconfig.build.json"),
		);
		expect(buildTsconfig).toBeDefined();
		expect(buildTsconfig!.content).toContain("tsconfig/build.json");
		expect(buildTsconfig!.content).toContain('"exclude": ["src/**/*.test.ts"]');
	});

	test("non-publishable omits tsconfig.build.json", () => {
		const files = buildConfigFiles({
			packagePath: "libs/core",
			name: "todo",
		});
		expect(files).toHaveLength(2);
		expect(
			files.find((f) => f.filename.endsWith("tsconfig.build.json")),
		).toBeUndefined();
	});
});

describe("buildCliConfigFiles", () => {
	test("generates eslint and tsconfig files", () => {
		const files = buildCliConfigFiles({ packagePath: "apps/cli", name: "todo" });
		expect(files).toHaveLength(2);
	});

	test("eslint config includes both generated and cli presets", () => {
		const files = buildCliConfigFiles({ packagePath: "apps/cli", name: "todo" });
		const eslint = files.find((f) => f.filename.endsWith("eslint.config.ts"));
		expect(eslint!.content).toContain("configs.generated");
		expect(eslint!.content).toContain("configs.cli");
	});

	test("tsconfig is same as standard config", () => {
		const standardFiles = buildConfigFiles({ packagePath: "apps/cli", name: "test" });
		const cliFiles = buildCliConfigFiles({ packagePath: "apps/cli", name: "test" });
		const standardTsconfig = standardFiles.find((f) =>
			f.filename.endsWith("tsconfig.json"),
		);
		const cliTsconfig = cliFiles.find((f) =>
			f.filename.endsWith("tsconfig.json"),
		);
		expect(cliTsconfig!.content).toBe(standardTsconfig!.content);
	});
});
