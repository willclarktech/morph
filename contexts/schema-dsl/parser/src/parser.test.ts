import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { compile } from "../../compiler/src/index";
import { decompile } from "../../decompiler/src/index";
import { parse } from "./index";

const fixturesDir = path.resolve(
	import.meta.dir,
	"../../../../examples/fixtures",
);

const normalize = (value: unknown): unknown => {
	if (value === null || value === undefined || typeof value !== "object")
		return value;
	if (Array.isArray(value)) return value.map(normalize);
	const object = value as Record<string, unknown>;
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(object).sort()) {
		const v = normalize(object[key]);
		if (Array.isArray(v) && v.length === 0) continue;
		if (
			typeof v === "object" &&
			v !== null &&
			!Array.isArray(v) &&
			Object.keys(v).length === 0
		)
			continue;
		sorted[key] = v;
	}
	return sorted;
};

const loadSchema = (
	name: string,
): { readonly dsl: string; readonly schema: Record<string, unknown> } => {
	const source = readFileSync(
		path.resolve(fixturesDir, name, "schema.morph"),
		"utf8",
	);
	const parseResult = parse(source);
	if (parseResult.errors.length > 0) {
		throw new Error(
			`Parse errors in ${name}: ${parseResult.errors.map((e) => e.message).join(", ")}`,
		);
	}
	const compileResult = compile(parseResult.ast!);
	if (compileResult.errors.length > 0) {
		throw new Error(
			`Compile errors in ${name}: ${compileResult.errors.map((e) => e.message).join(", ")}`,
		);
	}
	return {
		schema: compileResult.schema as unknown as Record<string, unknown>,
		dsl: source,
	};
};

describe("parse", () => {
	test("parses a minimal domain", () => {
		const result = parse('domain Foo\ncontext bar "desc" {}');
		expect(result.errors).toHaveLength(0);
		expect(result.ast?.name).toBe("Foo");
		expect(result.ast?.contexts).toHaveLength(1);
	});

	test("parses entity with attributes and relationships", () => {
		const result = parse(`
domain Test
context c "" {
  @root
  entity User "A user" {
    name: string "Display name"
    @unique
    email: string "Email"
    belongs_to Company "Works at"
  }
}
`);
		expect(result.errors).toHaveLength(0);
		const entity = result.ast?.contexts[0]?.entities[0];
		expect(entity?.name).toBe("User");
		expect(entity?.attributes).toHaveLength(2);
		expect(entity?.relationships).toHaveLength(1);
	});

	test("parses type expressions", () => {
		const result = parse(`
domain Test
context c "" {
  entity E "" {
    a: string ""
    b: number ""
    c: boolean ""
    d: E.id ""
    e: string[] ""
    f?: OtherType ""
  }
}
`);
		expect(result.errors).toHaveLength(0);
		const attributes = result.ast?.contexts[0]?.entities[0]?.attributes;
		expect(attributes?.[0]?.type.kind).toBe("primitive");
		expect(attributes?.[3]?.type.kind).toBe("entityId");
		expect(attributes?.[4]?.type.kind).toBe("array");
		expect(attributes?.[5]?.optional).toBe(true);
	});

	test("parses keywords as field names in types", () => {
		const result = parse(`
domain Test
context c "" {
  union Result<T, E> by status "" {
    error "Error variant" {
      error: E ""
    }
    ok "Success" {
      value: T ""
    }
  }
}
`);
		expect(result.errors).toHaveLength(0);
		const variants =
			result.ast?.contexts[0]?.types[0]?.kind === "sum"
				? result.ast.contexts[0].types[0].variants
				: [];
		expect(variants).toHaveLength(2);
		expect(variants[0]?.name).toBe("error");
		expect(variants[0]?.fields?.[0]?.name).toBe("error");
	});

	test("parses invariant with condition expressions", () => {
		const result = parse(`
domain Test
context c "" {
  entity E "" { x: number "" }
  @context
  invariant Check "desc" violation "msg" where input.x == context.y
}
`);
		expect(result.errors).toHaveLength(0);
		const inv = result.ast?.contexts[0]?.invariants[0];
		expect(inv?.name).toBe("Check");
		expect(inv?.scope.kind).toBe("context");
		expect(inv?.condition.kind).toBe("equals");
	});

	test("returns errors for invalid input", () => {
		const result = parse("domain");
		expect(result.errors.length).toBeGreaterThan(0);
	});
});

const examples = [
	"address-book",
	"blog-app",
	"cache-port",
	"code-generator",
	"delivery-tracker",
	"ledger",
	"marketplace",
	"pastebin-app",
	"todo-app",
	"type-gallery",
] as const;

describe("round-trip", () => {
	for (const name of examples) {
		test(`${name}: .morph → compile → decompile → parse → compile → compare`, () => {
			const { schema } = loadSchema(name);

			const dsl = decompile(schema as any);
			const parseResult = parse(dsl);
			expect(parseResult.errors).toHaveLength(0);

			const compileResult = compile(parseResult.ast!);
			expect(compileResult.errors).toHaveLength(0);

			expect(normalize(compileResult.schema)).toEqual(normalize(schema));
		});
	}
});

describe("round-trip completeness", () => {
	for (const name of examples) {
		test(`${name}: no structural loss through compile → decompile`, () => {
			const source = readFileSync(
				path.resolve(fixturesDir, name, "schema.morph"),
				"utf8",
			);
			const original = parse(source);

			const compiled = compile(original.ast!);
			const decompiled = decompile(compiled.schema as any);
			const reparsed = parse(decompiled);

			for (const ctx of original.ast!.contexts) {
				const rt = reparsed.ast!.contexts.find((c) => c.name === ctx.name)!;
				expect(rt.entities.length).toBe(ctx.entities.length);
				expect(rt.valueObjects.length).toBe(ctx.valueObjects.length);
				expect(rt.commands.length).toBe(ctx.commands.length);
				expect(rt.queries.length).toBe(ctx.queries.length);
				expect(rt.functions.length).toBe(ctx.functions.length);
				expect(rt.invariants.length).toBe(ctx.invariants.length);
				expect(rt.contracts.length).toBe(ctx.contracts.length);
				expect(rt.ports.length).toBe(ctx.ports.length);
				expect(rt.subscribers.length).toBe(ctx.subscribers.length);
				expect(rt.types.length).toBe(ctx.types.length);
				expect(rt.errors.length).toBe(ctx.errors.length);
			}
		});
	}
});
