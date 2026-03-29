import { createJsonCodec } from "@morphdsl/codec-json-impls";
import { createYamlCodec } from "@morphdsl/codec-yaml-impls";
import { describe, expect, test } from "bun:test";
import { Effect } from "effect";

import { createCodecRegistry } from "./create-codec-registry";
import { parseAcceptHeader } from "./negotiation";

const run = <A>(effect: Effect.Effect<A, unknown>) => Effect.runPromise(effect);

describe("parseAcceptHeader", () => {
	test("parses simple accept header", () => {
		const result = parseAcceptHeader("application/json");
		expect(result).toEqual([{ type: "application/json", quality: 1 }]);
	});

	test("parses multiple types with quality factors", () => {
		const result = parseAcceptHeader(
			"application/json, application/x-yaml;q=0.9, */*;q=0.1",
		);
		expect(result).toEqual([
			{ type: "application/json", quality: 1 },
			{ type: "application/x-yaml", quality: 0.9 },
			{ type: "*/*", quality: 0.1 },
		]);
	});

	test("empty header defaults to */*", () => {
		const result = parseAcceptHeader("");
		expect(result).toEqual([{ type: "*/*", quality: 1 }]);
	});
});

describe("createJsonCodec", () => {
	const codec = createJsonCodec();

	test("has correct format and mime types", () => {
		expect(codec.format).toBe("json");
		expect(codec.mimeContribution.mimeTypes).toEqual(["application/json"]);
	});

	test("encode/decode round-trip with simple values", async () => {
		const value = { name: "test", count: 42 };
		const encoded = await run(codec.encode(value, ""));
		expect(encoded.contentType).toBe("application/json");
		const decoded = await run(codec.decode(encoded.body, ""));
		expect(decoded).toEqual(value);
	});

	test("round-trips BigInt via tagged JSON", async () => {
		const value = { amount: 123_456_789n };
		const encoded = await run(codec.encode(value, ""));
		const decoded = (await run(codec.decode(encoded.body, ""))) as {
			amount: bigint;
		};
		expect(decoded.amount).toBe(123_456_789n);
	});

	test("round-trips Date via tagged JSON", async () => {
		const date = new Date("2024-01-31T00:00:00.000Z");
		const value = { createdAt: date };
		const encoded = await run(codec.encode(value, ""));
		const decoded = (await run(codec.decode(encoded.body, ""))) as {
			createdAt: Date;
		};
		expect(decoded.createdAt).toEqual(date);
	});
});

describe("createCodecRegistry", () => {
	const jsonCodec = createJsonCodec();
	const registry = createCodecRegistry([jsonCodec], "json");

	test("get returns codec by format name", async () => {
		const codec = await run(registry.get("json"));
		expect(codec.format).toBe("json");
	});

	test("get fails for unknown format", async () => {
		const result = await Effect.runPromiseExit(registry.get("unknown"));
		expect(result._tag).toBe("Failure");
	});

	test("negotiate returns json for application/json", async () => {
		const codec = await run(registry.negotiate("application/json"));
		expect(codec.format).toBe("json");
	});

	test("negotiate returns default for */*", async () => {
		const codec = await run(registry.negotiate("*/*"));
		expect(codec.format).toBe("json");
	});

	test("negotiate returns default for empty accept", async () => {
		const codec = await run(registry.negotiate(""));
		expect(codec.format).toBe("json");
	});

	test("fromContentType returns json for application/json", async () => {
		const codec = await run(registry.fromContentType("application/json"));
		expect(codec.format).toBe("json");
	});

	test("fromContentType strips parameters", async () => {
		const codec = await run(
			registry.fromContentType("application/json; charset=utf-8"),
		);
		expect(codec.format).toBe("json");
	});

	test("getAvailableFormats lists all registered formats", async () => {
		const formats = await run(registry.getAvailableFormats());
		expect(formats).toEqual([
			{ format: "json", mimeTypes: ["application/json"] },
		]);
	});
});

describe("createYamlCodec", () => {
	const codec = createYamlCodec();

	test("has correct format and mime types", () => {
		expect(codec.format).toBe("yaml");
		expect(codec.mimeContribution.mimeTypes).toContain("application/x-yaml");
	});

	test("encode/decode round-trip with simple values", async () => {
		const value = { name: "test", count: 42 };
		const encoded = await run(codec.encode(value, ""));
		expect(encoded.contentType).toBe("application/x-yaml");
		const decoded = await run(codec.decode(encoded.body, ""));
		expect(decoded).toEqual(value);
	});

	test("round-trips BigInt via marker object", async () => {
		const value = { amount: 123_456_789n };
		const encoded = await run(codec.encode(value, ""));
		const decoded = (await run(codec.decode(encoded.body, ""))) as {
			amount: bigint;
		};
		expect(decoded.amount).toBe(123_456_789n);
	});

	test("round-trips Date via YAML timestamp", async () => {
		const date = new Date("2024-01-31T00:00:00.000Z");
		const value = { createdAt: date };
		const encoded = await run(codec.encode(value, ""));
		const decoded = (await run(codec.decode(encoded.body, ""))) as {
			createdAt: Date;
		};
		expect(decoded.createdAt).toEqual(date);
	});

	test("round-trips nested objects and arrays", async () => {
		const value = {
			items: [
				{ name: "a", tags: ["x", "y"] },
				{ name: "b", tags: ["z"] },
			],
		};
		const encoded = await run(codec.encode(value, ""));
		const decoded = await run(codec.decode(encoded.body, ""));
		expect(decoded).toEqual(value);
	});

	test("round-trips optional fields", async () => {
		const value = { name: "test", description: undefined };
		const encoded = await run(codec.encode(value, ""));
		const decoded = (await run(codec.decode(encoded.body, ""))) as Record<
			string,
			unknown
		>;
		expect(decoded["name"]).toBe("test");
	});
});

describe("multi-codec registry", () => {
	const jsonCodec = createJsonCodec();
	const yamlCodec = createYamlCodec();
	const registry = createCodecRegistry([jsonCodec, yamlCodec], "json");

	test("negotiate selects yaml for application/x-yaml", async () => {
		const codec = await run(registry.negotiate("application/x-yaml"));
		expect(codec.format).toBe("yaml");
	});

	test("negotiate selects json for application/json", async () => {
		const codec = await run(registry.negotiate("application/json"));
		expect(codec.format).toBe("json");
	});

	test("negotiate prefers higher quality", async () => {
		const codec = await run(
			registry.negotiate("application/x-yaml;q=0.9, application/json;q=1.0"),
		);
		expect(codec.format).toBe("json");
	});

	test("negotiate falls back to default for */*", async () => {
		const codec = await run(registry.negotiate("*/*"));
		expect(codec.format).toBe("json");
	});

	test("fromContentType selects yaml for text/yaml", async () => {
		const codec = await run(registry.fromContentType("text/yaml"));
		expect(codec.format).toBe("yaml");
	});

	test("getAvailableFormats lists both formats", async () => {
		const formats = await run(registry.getAvailableFormats());
		expect(formats).toHaveLength(2);
		expect(formats.map((f) => f.format).sort()).toEqual(["json", "yaml"]);
	});
});
