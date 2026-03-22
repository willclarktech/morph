/**
 * Recursively sort all keys in an object alphabetically.
 * Arrays are left unchanged, nested objects are sorted recursively.
 *
 * @example
 * sortObjectKeys({ b: 1, a: 2 }) // { a: 2, b: 1 }
 * sortObjectKeys({ b: { d: 1, c: 2 }, a: 3 }) // { a: 3, b: { c: 2, d: 1 } }
 */
export const sortObjectKeys = <T extends Record<string, unknown>>(
	input: T,
): T => {
	if (Array.isArray(input)) {
		return input as T;
	}
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(input).sort()) {
		const value = input[key];
		sorted[key] =
			typeof value === "object" && value !== null && !Array.isArray(value)
				? sortObjectKeys(value as Record<string, unknown>)
				: value;
	}
	return sorted as T;
};
