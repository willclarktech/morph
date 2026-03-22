/**
 * Result extraction from browser pages.
 */
import type { Page } from "playwright";

/**
 * How to extract results from a page.
 */
export type ResultExtractor =
	| DlExtractor
	| JsonExtractor
	| TableExtractor
	| TextExtractor
	| UrlExtractor;

/**
 * Extract JSON from an element's text content.
 */
export interface JsonExtractor {
	readonly selector: string;
	readonly type: "json";
}

/**
 * Extract text from an element.
 */
export interface TextExtractor {
	readonly selector: string;
	readonly type: "text";
}

/**
 * Extract data from URL (e.g., capture ID from redirect).
 */
export interface UrlExtractor {
	/** Named capture groups to extract */
	readonly captures: Record<string, number>;
	/** Regex pattern to match URL */
	readonly pattern: RegExp;
	readonly type: "url";
}

/**
 * Extract data from a table.
 */
export interface TableExtractor {
	/** Column mappings: attribute name -> column index (0-based) */
	readonly columns: Record<string, number>;
	/** CSS selector for table rows */
	readonly rowSelector: string;
	readonly type: "table";
}

/**
 * Extract data from a definition list (<dl>).
 * Extracts dt/dd pairs as key-value object, plus id from URL.
 */
export interface DlExtractor {
	/** CSS selector for the <dl> element */
	readonly selector: string;
	readonly type: "dl";
}

/**
 * Extract result from page based on extractor configuration.
 */
export const extractResult = async (
	page: Page,
	extractor?: ResultExtractor,
): Promise<unknown> => {
	if (!extractor) {
		return undefined;
	}

	switch (extractor.type) {
		case "dl": {
			const dl = page.locator(extractor.selector);
			const result: Record<string, unknown> = {};

			// Extract id from URL if available (e.g., /pastes/uuid)
			const urlMatch = /\/\w+\/([^/]+)$/.exec(page.url());
			if (urlMatch?.[1]) {
				result["id"] = urlMatch[1];
			}

			// Extract dt/dd pairs from definition list
			// Get all dt and dd elements and pair them by index
			const dts = await dl.locator("dt").all();
			const dds = await dl.locator("dd").all();

			for (let index = 0; index < dts.length && index < dds.length; index++) {
				const key = await dts[index]?.textContent();
				const dd = dds[index]!;
				// Check for checkbox toggle inside dd
				const checkbox = dd.locator('input[type="checkbox"]');
				const hasCheckbox = (await checkbox.count()) > 0;
				if (hasCheckbox) {
					const camelKey = key!
						.replaceAll(/\s+(.)/g, (_, c: string) => c.toUpperCase())
						.replace(/^./, (c) => c.toLowerCase());
					result[camelKey] = await checkbox.isChecked();
				} else {
					const value = await dd.textContent();
					if (key && value) {
						// Convert "Created At" -> "createdAt"
						const camelKey = key
							.replaceAll(/\s+(.)/g, (_, c: string) => c.toUpperCase())
							.replace(/^./, (c) => c.toLowerCase());
						// Parse booleans and numbers (also handle formatted display values)
						if (value === "true" || value === "\u2713") {
							result[camelKey] = true;
						} else if (value === "false" || value === "\u2717") {
							result[camelKey] = false;
						} else if (/^-?\d+(?:\.\d+)?$/.test(value)) {
							result[camelKey] = Number(value);
						} else {
							result[camelKey] = value;
						}
					}
				}
			}

			return result;
		}

		case "json": {
			const text = await page.locator(extractor.selector).textContent();
			return text ? JSON.parse(text) : undefined;
		}

		case "table": {
			const rows = await page.locator(extractor.rowSelector).all();
			const items: Record<string, string>[] = [];

			for (const row of rows) {
				const cells = await row.locator("td").all();
				const item: Record<string, string> = {};

				for (const [attributeName, colIndex] of Object.entries(
					extractor.columns,
				)) {
					const cell = cells[colIndex];
					if (cell) {
						item[attributeName] = (await cell.textContent()) ?? "";
					}
				}

				items.push(item);
			}

			return items;
		}

		case "text": {
			return page.locator(extractor.selector).textContent();
		}

		case "url": {
			const url = page.url();
			const match = extractor.pattern.exec(url);
			if (match) {
				const result: Record<string, string> = {};
				for (const [key, groupIndex] of Object.entries(extractor.captures)) {
					result[key] = match[groupIndex] ?? "";
				}
				return result;
			}
			return undefined;
		}
	}
};
