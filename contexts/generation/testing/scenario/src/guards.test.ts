import { describe, expect, test } from "bun:test";

import { isAssertion } from "./guards";

describe("isAssertion", () => {
	test("returns true for assertion", () => {
		const assertion = {
			_tag: "Assertion" as const,
			subject: "result",
			field: "name",
			matcher: { type: "toBe" as const, expected: "test" },
			withProse: (prose: string) => ({ ...assertion, prose }),
		};
		expect(isAssertion(assertion)).toBe(true);
	});

	test("returns false for operation call", () => {
		const operationCall = {
			_tag: "OperationCall" as const,
			name: "createTodo",
			params: { title: "test" },
		};
		expect(isAssertion(operationCall)).toBe(false);
	});
});
