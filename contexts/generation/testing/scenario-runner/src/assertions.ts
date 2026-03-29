import type { AssertionMatcher } from "@morphdsl/scenario";

export const runAssertion = (
	value: unknown,
	matcher: AssertionMatcher,
): void => {
	const stringify = (v: unknown): string =>
		typeof v === "string" ? v : JSON.stringify(v);
	switch (matcher.type) {
		case "toBe": {
			if (value !== matcher.expected) {
				throw new Error(
					`Expected ${stringify(matcher.expected)}, got ${stringify(value)}`,
				);
			}
			break;
		}
		case "toBeDefined": {
			if (value === undefined || value === null) {
				throw new Error("Expected value to be defined");
			}
			break;
		}
		case "toBeUndefined": {
			if (value !== undefined) {
				throw new Error(`Expected undefined, got ${stringify(value)}`);
			}
			break;
		}
		case "toContain": {
			if (Array.isArray(value)) {
				if (!value.includes(matcher.expected)) {
					throw new Error(
						`Expected array to contain ${stringify(matcher.expected)}`,
					);
				}
			} else if (typeof value === "string") {
				if (!value.includes(String(matcher.expected))) {
					throw new Error(
						`Expected string to contain ${stringify(matcher.expected)}`,
					);
				}
			} else {
				throw new TypeError(`Expected array or string, got ${typeof value}`);
			}
			break;
		}
		case "toHaveLength": {
			if (!Array.isArray(value) || value.length !== matcher.expected) {
				throw new Error(
					`Expected length ${String(matcher.expected)}, got ${Array.isArray(value) ? String(value.length) : "non-array"}`,
				);
			}
			break;
		}
	}
};

export const getField = (object: unknown, field: string): unknown => {
	if (typeof object !== "object" || object === null) return undefined;
	return (object as Record<string, unknown>)[field];
};

export const formatAssertionProse = (
	subject: string,
	field: string,
	matcher: AssertionMatcher,
): string => {
	switch (matcher.type) {
		case "toBe": {
			return `${subject}${field} is ${JSON.stringify(matcher.expected)}`;
		}
		case "toBeDefined": {
			return `${subject}${field} is defined`;
		}
		case "toBeUndefined": {
			return `${subject}${field} is undefined`;
		}
		case "toContain": {
			return `${subject}${field} contains ${JSON.stringify(matcher.expected)}`;
		}
		case "toHaveLength": {
			return `${subject}${field} has length ${matcher.expected}`;
		}
	}
};
