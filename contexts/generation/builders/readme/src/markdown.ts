/**
 * Markdown utilities for README generation.
 * Pure functions that generate markdown strings.
 */

/**
 * Generate a markdown heading.
 */
export const heading = (level: 1 | 2 | 3 | 4 | 5 | 6, text: string): string =>
	`${"#".repeat(level)} ${text}`;

/**
 * Generate a markdown table.
 */
export const table = (
	headers: readonly string[],
	rows: readonly (readonly string[])[],
): string => {
	if (headers.length === 0) return "";

	const headerRow = `| ${headers.join(" | ")} |`;
	const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`;
	const dataRows = rows.map((row) => `| ${row.join(" | ")} |`).join("\n");

	return [headerRow, separatorRow, dataRows].filter(Boolean).join("\n");
};

/**
 * Generate a fenced code block.
 */
export const codeBlock = (code: string, lang = ""): string =>
	`\`\`\`${lang}\n${code}\n\`\`\``;

/**
 * Generate a bullet list.
 */
export const list = (items: readonly string[]): string =>
	items.map((item) => `- ${item}`).join("\n");

/**
 * Generate a markdown link.
 */
export const link = (text: string, url: string): string => `[${text}](${url})`;

/**
 * Inline code.
 */
export const code = (text: string): string => `\`${text}\``;

/**
 * Bold text.
 */
export const bold = (text: string): string => `**${text}**`;

/**
 * Join sections with double newlines, filtering out empty strings.
 */
export const joinSections = (sections: readonly string[]): string =>
	sections.filter(Boolean).join("\n\n");
