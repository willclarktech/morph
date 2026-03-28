/**
 * Template utilities for code generation.
 */

/**
 * Filter and join lines, removing undefined/empty values.
 *
 * Useful for building code from conditional sections without
 * leaving blank lines or needing complex ternaries.
 */
export const lines = (items: readonly (string | undefined)[]): string =>
	items.filter(Boolean).join("\n");

/**
 * Indent each line of a multi-line string by N tabs.
 * Empty lines are preserved without adding whitespace.
 *
 * @example
 * indent("foo\nbar", 2) // "\t\tfoo\n\t\tbar"
 */
export const indent = (content: string, level: number): string => {
	const prefix = "\t".repeat(level);
	return content
		.split("\n")
		.map((line) => (line.trim() ? prefix + line : line))
		.join("\n");
};

/**
 * Indent subsequent lines of multi-line content for template interpolation.
 *
 * Unlike `indent()` which indents ALL lines, this leaves the first line
 * unchanged (it inherits indentation from the template literal) and only
 * indents lines 2+.
 *
 * @example
 * // Problem: multi-line interpolations break indentation
 * `\t\t${content}` // First line gets \t\t, but subsequent lines don't!
 *
 * // Solution: indentBlock indents subsequent lines
 * `\t\t${indentBlock(content, 2)}` // All lines now aligned at level 2
 *
 * indentBlock("foo\nbar\nbaz", 2) // "foo\n\t\tbar\n\t\tbaz"
 */
export const indentBlock = (content: string, level: number): string => {
	const prefix = "\t".repeat(level);
	return content
		.split("\n")
		.map((line, index) => (index === 0 || !line.trim() ? line : prefix + line))
		.join("\n");
};

/**
 * Create a newline separator with N tabs.
 * Replaces manual tab-counting in `.join("\n\t\t\t")` patterns.
 *
 * @example
 * items.join(separator(5))           // same as .join("\n\t\t\t\t\t")
 * items.join(separator(1, "", "| ")) // same as .join("\n\t| ")
 * items.join(separator(1, ","))      // same as .join(",\n\t")
 * items.join(separator(3, "\n"))     // same as .join("\n\n\t\t\t")
 */
export const separator = (level: number, pre = "", post = ""): string =>
	pre + "\n" + "\t".repeat(level) + post;

/**
 * Join items with newline + N tabs as separator.
 * Filters out undefined/empty items. Convenience wrapper around separator().
 *
 * @example
 * joinLines(["<th>A</th>", "<th>B</th>"], 5)
 * // "<th>A</th>\n\t\t\t\t\t<th>B</th>"
 */
export const joinLines = (
	items: readonly (string | undefined)[],
	level: number,
): string => items.filter(Boolean).join(separator(level));

/**
 * Filter falsy values from config property arrays.
 * Use with conditional expressions to build object properties.
 *
 * @example
 * const props = configProperties([
 *   hasAuth && "auth: authStrategy,",
 *   "required: true,",
 * ]);
 * // If hasAuth is false: ["required: true,"]
 * // If hasAuth is true: ["auth: authStrategy,", "required: true,"]
 */
export const configProperties = (
	items: readonly (string | false | undefined)[],
	// eslint-disable-next-line unicorn/prefer-native-coercion-functions -- type guard needed for TypeScript narrowing
): string[] => items.filter((item): item is string => Boolean(item));
