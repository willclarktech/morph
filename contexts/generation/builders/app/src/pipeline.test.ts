import { describe, expect, test } from "bun:test";

import type { GeneratedFile } from "@morphdsl/domain-schema";

import { generateAppFiles } from "./pipeline";

describe("generateAppFiles", () => {
	test("includes all file types in correct order", () => {
		const config = {
			appType: "cli",
			packagePath: "apps/my-cli",
			name: "my-cli",
			generatePackageJson: () => '{ "name": "my-cli" }',
			generateConfigFiles: (): readonly GeneratedFile[] => [
				{ filename: "apps/my-cli/tsconfig.json", content: "{}" },
			],
			generateAppEntry: () => ({
				files: [
					{ filename: "apps/my-cli/src/index.ts", content: "main()" },
				] as const,
			}),
			generateEnvExample: () => "PORT=3000",
			generateDockerfile: () => "FROM oven/bun",
		};

		const files = generateAppFiles(config);

		expect(files).toHaveLength(5);
		expect(files[0]!.filename).toBe("apps/my-cli/package.json");
		expect(files[1]!.filename).toBe("apps/my-cli/tsconfig.json");
		expect(files[2]!.filename).toBe("apps/my-cli/src/index.ts");
		expect(files[3]!.filename).toBe("apps/my-cli/.env.example");
		expect(files[4]!.filename).toBe("apps/my-cli/Dockerfile");
	});

	test("prepends packagePath to package.json and env/docker", () => {
		const config = {
			appType: "api",
			packagePath: "apps/api",
			name: "api",
			generatePackageJson: () => "{}",
			generateConfigFiles: (): readonly GeneratedFile[] => [],
			generateAppEntry: () => ({ files: [] as const }),
			generateEnvExample: () => "",
			generateDockerfile: () => "",
		};

		const files = generateAppFiles(config);

		expect(files[0]!.filename).toBe("apps/api/package.json");
		expect(files.find((f) => f.filename === "apps/api/.env.example")).toBeDefined();
		expect(files.find((f) => f.filename === "apps/api/Dockerfile")).toBeDefined();
	});

	test("passes through content from each generator", () => {
		const config = {
			appType: "cli",
			packagePath: "pkg",
			name: "test",
			generatePackageJson: () => "pkg-json-content",
			generateConfigFiles: (): readonly GeneratedFile[] => [],
			generateAppEntry: () => ({ files: [] as const }),
			generateEnvExample: () => "env-content",
			generateDockerfile: () => "docker-content",
		};

		const files = generateAppFiles(config);

		expect(files.find((f) => f.filename === "pkg/package.json")!.content).toBe("pkg-json-content");
		expect(files.find((f) => f.filename === "pkg/.env.example")!.content).toBe("env-content");
		expect(files.find((f) => f.filename === "pkg/Dockerfile")!.content).toBe("docker-content");
	});

	test("flattens multiple config files and entry files", () => {
		const config = {
			appType: "api",
			packagePath: "apps/api",
			name: "api",
			generatePackageJson: () => "{}",
			generateConfigFiles: (): readonly GeneratedFile[] => [
				{ filename: "apps/api/tsconfig.json", content: "ts" },
				{ filename: "apps/api/.eslintrc.json", content: "lint" },
			],
			generateAppEntry: () => ({
				files: [
					{ filename: "apps/api/src/index.ts", content: "main" },
					{ filename: "apps/api/src/seed.ts", content: "seed" },
				] as const,
			}),
			generateEnvExample: () => "",
			generateDockerfile: () => "",
		};

		const files = generateAppFiles(config);

		// package.json + 2 config + 2 entry + env + docker = 7
		expect(files).toHaveLength(7);
	});
});
