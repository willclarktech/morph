import { describe, expect, test } from "bun:test";

import { getOptionNames, getParamNames, getSensitiveNames } from "./param-extraction";

const makeOp = (
	input: Record<string, { optional?: boolean; sensitive?: boolean }>,
) => ({
	def: { input },
});

describe("getParamNames", () => {
	test("returns non-optional, non-sensitive params", () => {
		const op = makeOp({
			title: {},
			note: { optional: true },
			password: { sensitive: true },
		});
		expect(getParamNames(op)).toEqual(["title"]);
	});

	test("returns all params when none are optional or sensitive", () => {
		const op = makeOp({ a: {}, b: {}, c: {} });
		expect(getParamNames(op)).toEqual(["a", "b", "c"]);
	});

	test("returns empty when all are optional", () => {
		const op = makeOp({ a: { optional: true }, b: { optional: true } });
		expect(getParamNames(op)).toEqual([]);
	});

	test("returns empty for empty input", () => {
		const op = makeOp({});
		expect(getParamNames(op)).toEqual([]);
	});
});

describe("getOptionNames", () => {
	test("returns only optional params", () => {
		const op = makeOp({
			title: {},
			note: { optional: true },
			desc: { optional: true },
		});
		expect(getOptionNames(op)).toEqual(["note", "desc"]);
	});

	test("returns empty when none optional", () => {
		const op = makeOp({ a: {}, b: {} });
		expect(getOptionNames(op)).toEqual([]);
	});
});

describe("getSensitiveNames", () => {
	test("returns only sensitive params", () => {
		const op = makeOp({
			title: {},
			password: { sensitive: true },
			apiKey: { sensitive: true },
		});
		expect(getSensitiveNames(op)).toEqual(["password", "apiKey"]);
	});

	test("returns empty when none sensitive", () => {
		const op = makeOp({ a: {}, b: {} });
		expect(getSensitiveNames(op)).toEqual([]);
	});
});
