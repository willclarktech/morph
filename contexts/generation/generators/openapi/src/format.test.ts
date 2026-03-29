import type { DomainSchema } from "@morphdsl/domain-schema";

import { describe, expect, test } from "bun:test";

import { getSchemaDescription, jsonToYaml } from "./format";

describe("jsonToYaml", () => {
	test("converts simple object", () => {
		const result = jsonToYaml({ name: "test", version: "1.0" });
		expect(result).toContain("name: test");
		expect(result).toContain("version: 1.0");
	});

	test("converts nested object", () => {
		const result = jsonToYaml({ info: { title: "API" } });
		expect(result).toContain("info:");
		expect(result).toContain("  title: API");
	});

	test("converts array", () => {
		const result = jsonToYaml({ tags: ["a", "b"] });
		expect(result).toContain("tags:");
		expect(result).toContain("- a");
		expect(result).toContain("- b");
	});

	test("handles null", () => {
		expect(jsonToYaml(null)).toBe("null");
	});

	test("handles boolean", () => {
		expect(jsonToYaml(true)).toBe("true");
		expect(jsonToYaml(false)).toBe("false");
	});

	test("handles number", () => {
		expect(jsonToYaml(42)).toBe("42");
	});

	test("quotes strings with colons", () => {
		expect(jsonToYaml("http://example.com")).toContain('"');
	});

	test("empty object returns {}", () => {
		expect(jsonToYaml({})).toBe("{}");
	});

	test("empty array returns []", () => {
		expect(jsonToYaml([])).toBe("[]");
	});

	test("quotes strings with hash", () => {
		expect(jsonToYaml("test # comment")).toContain('"');
	});
});

describe("getSchemaDescription", () => {
	test("returns first context description", () => {
		const schema = {
			name: "test",
			contexts: {
				main: {
					description: "Main context description",
					entities: {},
					commands: {},
					queries: {},
					invariants: [],
					dependencies: [],
				},
			},
		} as DomainSchema;
		expect(getSchemaDescription(schema)).toBe("Main context description");
	});

	test("returns fallback for empty contexts", () => {
		const schema = {
			name: "test",
			contexts: {},
		} as DomainSchema;
		expect(getSchemaDescription(schema)).toBe("test domain API");
	});
});
