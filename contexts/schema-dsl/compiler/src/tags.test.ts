import { parse } from "@morphdsl/schema-dsl-parser";
import { describe, expect, test } from "bun:test";

import { compile } from "./index";

const compileSource = (source: string) => {
	const parseResult = parse(source);
	if (!parseResult.ast) throw new Error("parse failed");
	return compile(parseResult.ast);
};

describe("operation tag validation", () => {
	test("rejects an untagged command", () => {
		const result = compileSource(`
domain Demo

context things "things" {
	@root
	entity Thing { name: string }

	command makeThing
		writes Thing
		input { name: string }
		output Thing
		emits ThingMade
}
`);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]?.message).toContain("makeThing");
		expect(result.errors[0]?.message).toContain("@api");
	});

	test("rejects an untagged query", () => {
		const result = compileSource(`
domain Demo

context things "things" {
	@root
	entity Thing { name: string }

	query getThing
		reads Thing
		input { thingId: Thing.id }
		output Thing
}
`);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]?.message).toContain("query 'getThing'");
	});

	test("rejects an untagged function", () => {
		const result = compileSource(`
domain Demo

context things "things" {
	@root
	entity Thing { name: string }

	function describe
		input { name: string }
		output string
}
`);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]?.message).toContain("function 'describe'");
	});

	test("accepts an operation tagged via @api directly", () => {
		const result = compileSource(`
domain Demo

context things "things" {
	@root
	entity Thing { name: string }

	@api
	query getThing
		reads Thing
		input { thingId: Thing.id }
		output Thing
}
`);
		expect(result.errors).toHaveLength(0);
	});

	test("accepts an operation tagged via a profile that expands to tags", () => {
		const result = compileSource(`
domain Demo

profiles {
	web: @api @ui
}

context things "things" {
	@root
	entity Thing { name: string }

	#web
	query getThing
		reads Thing
		input { thingId: Thing.id }
		output Thing
}
`);
		expect(result.errors).toHaveLength(0);
	});
});
