import { describe, expect, test } from "bun:test";

import { generate } from "./index";

describe("generate env", () => {
	test("always includes NODE_ENV", () => {
		const result = generate("TEST", "api", {});
		expect(result).toContain("NODE_ENV=development");
	});

	test("always includes header comment", () => {
		const result = generate("TODO", "cli", {});
		expect(result).toContain("# TODO Environment Configuration");
	});

	test("API includes PORT", () => {
		const result = generate("TODO", "api", {});
		expect(result).toContain("PORT=3000");
	});

	test("CLI does not include PORT", () => {
		const result = generate("TODO", "cli", {});
		expect(result).not.toContain("PORT=");
	});

	test("UI includes PORT and API_URL", () => {
		const result = generate("TODO", "ui", {});
		expect(result).toContain("PORT=8080");
		expect(result).toContain("TODO_API_URL=http://localhost:3000");
	});

	test("MCP does not include PORT", () => {
		const result = generate("TODO", "mcp", {});
		expect(result).not.toContain("PORT=");
	});

	test("hasEntities includes storage config", () => {
		const result = generate("TODO", "cli", { hasEntities: true });
		expect(result).toContain("TODO_STORAGE=memory");
		expect(result).toContain("TODO_DATA_FILE=.data.json");
	});

	test("hasEvents includes event store config", () => {
		const result = generate("TODO", "cli", { hasEvents: true });
		expect(result).toContain("TODO_EVENT_STORE=memory");
	});

	test("hasAuth includes JWT secret", () => {
		const result = generate("TODO", "api", { hasAuth: true });
		expect(result).toContain("TODO_JWT_SECRET=");
	});

	test("all features combined", () => {
		const result = generate("APP", "api", {
			hasEntities: true,
			hasEvents: true,
			hasAuth: true,
		});
		expect(result).toContain("APP_STORAGE=memory");
		expect(result).toContain("APP_EVENT_STORE=memory");
		expect(result).toContain("PORT=3000");
		expect(result).toContain("APP_JWT_SECRET=");
		expect(result).toContain("NODE_ENV=development");
	});
});
