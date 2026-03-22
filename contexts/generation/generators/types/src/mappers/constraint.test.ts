import { describe, expect, test } from "bun:test";

import type { ConstraintDef } from "@morph/domain-schema";

import { constraintsToRefinements } from "./constraint";

describe("constraintsToRefinements", () => {
	test("returns empty string for undefined", () => {
		expect(constraintsToRefinements(undefined)).toBe("");
	});

	test("returns empty string for empty array", () => {
		expect(constraintsToRefinements([])).toBe("");
	});

	test("nonEmpty constraint", () => {
		const constraints: ConstraintDef[] = [{ kind: "nonEmpty" }];
		expect(constraintsToRefinements(constraints)).toBe(
			".pipe(S.nonEmptyString())",
		);
	});

	test("positive constraint", () => {
		const constraints: ConstraintDef[] = [{ kind: "positive" }];
		expect(constraintsToRefinements(constraints)).toBe(".pipe(S.positive())");
	});

	test("pattern constraint", () => {
		const constraints: ConstraintDef[] = [
			{ kind: "pattern", regex: "^[a-z]+$" },
		];
		expect(constraintsToRefinements(constraints)).toBe(
			".pipe(S.pattern(/^[a-z]+$/))",
		);
	});

	test("range with min and max", () => {
		const constraints: ConstraintDef[] = [{ kind: "range", min: 1, max: 100 }];
		expect(constraintsToRefinements(constraints)).toBe(
			".pipe(S.between(1, 100))",
		);
	});

	test("range with only min", () => {
		const constraints: ConstraintDef[] = [{ kind: "range", min: 0 }];
		expect(constraintsToRefinements(constraints)).toBe(
			".pipe(S.greaterThanOrEqualTo(0))",
		);
	});

	test("range with only max", () => {
		const constraints: ConstraintDef[] = [{ kind: "range", max: 255 }];
		expect(constraintsToRefinements(constraints)).toBe(
			".pipe(S.lessThanOrEqualTo(255))",
		);
	});

	test("unique constraint produces empty string", () => {
		const constraints: ConstraintDef[] = [{ kind: "unique" }];
		expect(constraintsToRefinements(constraints)).toBe("");
	});

	test("custom constraint produces comment", () => {
		const constraints: ConstraintDef[] = [
			{ kind: "custom", name: "validEmail", description: "Must be valid" },
		];
		expect(constraintsToRefinements(constraints)).toBe(
			" /* Custom: validEmail */",
		);
	});

	test("multiple constraints are concatenated", () => {
		const constraints: ConstraintDef[] = [
			{ kind: "nonEmpty" },
			{ kind: "pattern", regex: "^[A-Z]" },
		];
		const result = constraintsToRefinements(constraints);
		expect(result).toBe(".pipe(S.nonEmptyString()).pipe(S.pattern(/^[A-Z]/))");
	});
});
