import { describe, expect, test } from "bun:test";

import { buildDockerfile, buildDockerignore } from "./dockerfile-builder";

describe("buildDockerfile", () => {
	test("API configuration includes health check and port", () => {
		const result = buildDockerfile({
			name: "todo",
			build: {
				libs: ["dsl", "core"],
				appDir: "api",
			},
			production: {
				baseImage: "oven/bun:1-alpine",
				workdir: "/app",
				copyFrom: "full-app",
				port: 3000,
				healthCheckPath: "/health",
				cmd: ["bun", "start"],
			},
		});
		expect(result).toContain("FROM oven/bun:1-alpine AS builder");
		expect(result).toContain("EXPOSE ${PORT}");
		expect(result).toContain("HEALTHCHECK");
		expect(result).toContain("/health");
		expect(result).toContain('CMD ["bun", "start"]');
	});

	test("CLI configuration with binary build", () => {
		const result = buildDockerfile({
			name: "todo-cli",
			build: {
				libs: ["dsl", "core"],
				appDir: "cli",
				buildCommand: "bun build --compile src/index.ts --outfile todo-cli",
			},
			production: {
				baseImage: "alpine:3.19",
				workdir: "/app",
				copyFrom: { binary: "todo-cli" },
				entrypoint: ["./todo-cli"],
			},
		});
		expect(result).toContain("bun build --compile");
		expect(result).toContain("COPY --from=builder /app/todo-cli ./todo-cli");
		expect(result).toContain('ENTRYPOINT ["./todo-cli"]');
		expect(result).not.toContain("EXPOSE");
	});

	test("copies lib package.json files", () => {
		const result = buildDockerfile({
			name: "test",
			build: { libs: ["dsl", "core"], appDir: "api" },
			production: {
				baseImage: "oven/bun:1-alpine",
				workdir: "/app",
				copyFrom: "full-app",
				cmd: ["bun", "start"],
			},
		});
		expect(result).toContain(
			"COPY libs/dsl/package.json ./libs/dsl/",
		);
		expect(result).toContain(
			"COPY libs/core/package.json ./libs/core/",
		);
	});

	test("includes extra files when provided", () => {
		const result = buildDockerfile({
			name: "test",
			build: {
				libs: ["dsl"],
				appDir: "api",
				extraFiles: ["schema.json"],
			},
			production: {
				baseImage: "oven/bun:1-alpine",
				workdir: "/app",
				copyFrom: "full-app",
				cmd: ["bun", "start"],
			},
		});
		expect(result).toContain("COPY schema.json ./");
	});

	test("MCP configuration without port", () => {
		const result = buildDockerfile({
			name: "test",
			build: { libs: ["dsl"], appDir: "mcp" },
			production: {
				baseImage: "oven/bun:1-alpine",
				workdir: "/app",
				copyFrom: "full-app",
				cmd: ["bun", "start"],
			},
		});
		expect(result).not.toContain("EXPOSE");
		expect(result).not.toContain("HEALTHCHECK");
		expect(result).toContain("MCP uses stdio");
	});

	test("always includes frozen lockfile install", () => {
		const result = buildDockerfile({
			name: "test",
			build: { libs: [], appDir: "api" },
			production: {
				baseImage: "oven/bun:1-alpine",
				workdir: "/app",
				copyFrom: "full-app",
				cmd: ["bun", "start"],
			},
		});
		expect(result).toContain("RUN bun install --frozen-lockfile");
	});
});

describe("buildDockerignore", () => {
	test("includes node_modules", () => {
		expect(buildDockerignore()).toContain("node_modules/");
	});

	test("includes test files", () => {
		const result = buildDockerignore();
		expect(result).toContain("*.test.ts");
		expect(result).toContain("*.spec.ts");
	});

	test("excludes .env files but keeps .env.example", () => {
		const result = buildDockerignore();
		expect(result).toContain(".env");
		expect(result).toContain("!.env.example");
	});

	test("includes IDE files", () => {
		const result = buildDockerignore();
		expect(result).toContain(".vscode/");
		expect(result).toContain(".idea/");
	});
});
