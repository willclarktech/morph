import { describe, expect, test } from "bun:test";

import {
	buildCredentialAuthConfig,
	buildCwdResolution,
	buildTestEntry,
	buildTestImports,
	buildTokenAuthConfig,
} from "./builders";

describe("buildTestImports", () => {
	test("includes runner import", () => {
		const result = buildTestImports(
			"@test/api-runner",
			"createApiRunner",
			{ dsl: "@test/dsl", scenarios: "@test/scenarios" },
		);
		expect(result).toContain(
			'import { createApiRunner } from "@test/api-runner"',
		);
	});

	test("includes scenarios import", () => {
		const result = buildTestImports(
			"@test/runner",
			"createRunner",
			{ dsl: "@test/dsl", scenarios: "@test/scenarios" },
		);
		expect(result).toContain('import { scenarios } from "@test/scenarios"');
	});

	test("includes bun:test import", () => {
		const result = buildTestImports(
			"@test/runner",
			"createRunner",
			{ dsl: "@test/dsl", scenarios: "@test/scenarios" },
		);
		expect(result).toContain('import { expect, test } from "bun:test"');
	});

	test("includes extra imports when provided", () => {
		const result = buildTestImports(
			"@test/runner",
			"createRunner",
			{ dsl: "@test/dsl", scenarios: "@test/scenarios" },
			['import { foo } from "bar"'],
		);
		expect(result).toContain('import { foo } from "bar"');
	});

	test("includes path import", () => {
		const result = buildTestImports(
			"@test/runner",
			"createRunner",
			{ dsl: "@test/dsl", scenarios: "@test/scenarios" },
		);
		expect(result).toContain('import path from "node:path"');
	});
});

describe("buildTokenAuthConfig", () => {
	test("returns auth config when hasAuth is true", () => {
		const result = buildTokenAuthConfig(true);
		expect(result).toContain("authOperation");
		expect(result).toContain("createUser");
		expect(result).toContain("tokenField");
	});

	test("returns empty string when hasAuth is false", () => {
		expect(buildTokenAuthConfig(false)).toBe("");
	});
});

describe("buildCredentialAuthConfig", () => {
	test("includes appName and auth params when hasAuth is true", () => {
		const result = buildCredentialAuthConfig("todo-app", true);
		expect(result).toContain('appName: "todo-app"');
		expect(result).toContain("emailParam");
		expect(result).toContain("passwordParam");
	});

	test("includes only appName when hasAuth is false", () => {
		const result = buildCredentialAuthConfig("todo-app", false);
		expect(result).toContain('appName: "todo-app"');
		expect(result).not.toContain("emailParam");
	});
});

describe("buildCwdResolution", () => {
	test("default 2 levels up", () => {
		const result = buildCwdResolution();
		expect(result).toContain("import.meta.dir");
		expect(result).toContain('"..');
	});

	test("custom levels up", () => {
		const result = buildCwdResolution(3);
		expect(result).toContain("import.meta.dir");
		// Should have 3 ".." segments
		const dotsCount = (result.match(/"\.\./g) ?? []).length;
		expect(dotsCount).toBe(3);
	});
});

describe("buildTestEntry", () => {
	test("default test name", () => {
		const result = buildTestEntry();
		expect(result).toContain('test("scenarios"');
		expect(result).toContain("runAllAndPrint");
		expect(result).toContain("result.failed");
	});

	test("custom test name", () => {
		const result = buildTestEntry("integration");
		expect(result).toContain('test("integration"');
	});
});
