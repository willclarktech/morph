import { describe, expect, test } from "bun:test";

import { buildPackageJson } from "./package-json-builder";

describe("buildPackageJson", () => {
	test("generates valid JSON", () => {
		const result = buildPackageJson({
			projectName: "todo",
			packageSuffix: "core",
		});
		expect(() => JSON.parse(result)).not.toThrow();
	});

	test("uses lowercase project name for scope", () => {
		const result = JSON.parse(
			buildPackageJson({ projectName: "Todo", packageSuffix: "core" }),
		);
		expect(result.name).toBe("@todo/core");
	});

	test("includes base scripts", () => {
		const result = JSON.parse(
			buildPackageJson({ projectName: "test", packageSuffix: "core" }),
		);
		expect(result.scripts["build:check"]).toBe("tsc --noEmit");
		expect(result.scripts.lint).toBe("eslint .");
		expect(result.scripts.format).toBe("prettier --check .");
	});

	test("adds test script when requested", () => {
		const result = JSON.parse(
			buildPackageJson({
				projectName: "test",
				packageSuffix: "core",
				includeTestScript: true,
			}),
		);
		expect(result.scripts.test).toBe("bun test");
		expect(result.scripts["test:coverage"]).toBe(
			"bun test --coverage --coverage-reporter=lcov --coverage-dir=./coverage",
		);
	});

	test("adds start script when requested", () => {
		const result = JSON.parse(
			buildPackageJson({
				projectName: "test",
				packageSuffix: "api",
				includeStartScript: true,
			}),
		);
		expect(result.scripts.start).toBe("bun src/index.ts");
	});

	test("adds dev script when requested", () => {
		const result = JSON.parse(
			buildPackageJson({
				projectName: "test",
				packageSuffix: "api",
				includeDevScript: true,
			}),
		);
		expect(result.scripts.dev).toBe("bun --hot src/index.ts");
	});

	test("includes effect dependency when requested", () => {
		const result = JSON.parse(
			buildPackageJson({
				projectName: "test",
				packageSuffix: "core",
				includeEffect: true,
			}),
		);
		expect(result.dependencies.effect).toBeDefined();
	});

	test("includes jose dependency when requested", () => {
		const result = JSON.parse(
			buildPackageJson({
				projectName: "test",
				packageSuffix: "core",
				includeJose: true,
			}),
		);
		expect(result.dependencies.jose).toBeDefined();
	});

	test("includes fast-check in devDependencies", () => {
		const result = JSON.parse(
			buildPackageJson({
				projectName: "test",
				packageSuffix: "core",
				includeFastCheck: "devDependencies",
			}),
		);
		expect(result.devDependencies["fast-check"]).toBeDefined();
	});

	test("includes fast-check in dependencies", () => {
		const result = JSON.parse(
			buildPackageJson({
				projectName: "test",
				packageSuffix: "core",
				includeFastCheck: "dependencies",
			}),
		);
		expect(result.dependencies["fast-check"]).toBeDefined();
	});

	test("includes standard dev dependencies", () => {
		const result = JSON.parse(
			buildPackageJson({ projectName: "myapp", packageSuffix: "core" }),
		);
		expect(result.devDependencies["@myapp/eslint-config"]).toBe(
			"workspace:*",
		);
		expect(result.devDependencies["@myapp/tsconfig"]).toBe("workspace:*");
		expect(result.devDependencies.eslint).toBeDefined();
		expect(result.devDependencies.typescript).toBeDefined();
	});

	test("merges custom dependencies", () => {
		const result = JSON.parse(
			buildPackageJson({
				projectName: "test",
				packageSuffix: "core",
				dependencies: { "@test/dsl": "workspace:*" },
			}),
		);
		expect(result.dependencies["@test/dsl"]).toBe("workspace:*");
	});

	test("includes exports when provided", () => {
		const result = JSON.parse(
			buildPackageJson({
				projectName: "test",
				packageSuffix: "core",
				exports: { ".": "./src/index.ts" },
			}),
		);
		expect(result.exports["."]).toBe("./src/index.ts");
	});

	test("includes bin when provided", () => {
		const result = JSON.parse(
			buildPackageJson({
				projectName: "test",
				packageSuffix: "cli",
				bin: { "test-cli": "./src/index.ts" },
			}),
		);
		expect(result.bin["test-cli"]).toBe("./src/index.ts");
	});

	test("publishable adds files, publishConfig, and build script", () => {
		const result = JSON.parse(
			buildPackageJson({
				projectName: "test",
				packageSuffix: "core",
				publishable: true,
			}),
		);
		expect(result.files).toEqual(["dist"]);
		expect(result.publishConfig).toBeDefined();
		expect(result.publishConfig.exports["."]).toEqual({
			types: "./dist/index.d.ts",
			import: "./dist/index.js",
		});
		expect(result.scripts.build).toBeDefined();
	});

	test("publishable with isPrivate keeps private: true", () => {
		const result = JSON.parse(
			buildPackageJson({
				projectName: "test",
				packageSuffix: "core",
				publishable: true,
			}),
		);
		expect(result.private).toBe(true);
		expect(result.files).toEqual(["dist"]);
	});

	test("non-publishable omits files, publishConfig, and build script", () => {
		const result = JSON.parse(
			buildPackageJson({
				projectName: "test",
				packageSuffix: "core",
			}),
		);
		expect(result.files).toBeUndefined();
		expect(result.publishConfig).toBeUndefined();
		expect(result.scripts.build).toBeUndefined();
	});

	test("keys are in human-friendly order", () => {
		const result = JSON.parse(
			buildPackageJson({ projectName: "test", packageSuffix: "core" }),
		);
		const keys = Object.keys(result);
		expect(keys).toEqual([
			"$schema",
			"name",
			"version",
			"private",
			"type",
			"scripts",
			"devDependencies",
		]);
	});
});
