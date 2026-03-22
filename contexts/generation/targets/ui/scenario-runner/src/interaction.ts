/**
 * UI interaction execution for test runner.
 */
import type { Page } from "playwright";

import type { ResultExtractor } from "./extraction";

import { extractResult } from "./extraction";

/**
 * Defines how to execute an operation via the UI.
 */
export interface UiInteraction {
	/** Click an element after navigation/form */
	readonly click?: ClickAction;
	/** How to extract the result from the page */
	readonly extractResult?: ResultExtractor;
	/** Fill and submit a form */
	readonly form?: FormAction;
	/** Navigate to a page */
	readonly navigateTo?: string;
}

/**
 * Form interaction configuration.
 */
export interface FormAction {
	/** Field mappings: param name -> CSS selector */
	readonly fields: Record<string, string>;
	/** Route to navigate to (with :param placeholders) */
	readonly route: string;
	/** CSS selector for submit button */
	readonly submitButton: string;
}

/**
 * Click interaction configuration.
 */
export interface ClickAction {
	/** CSS selector for the element to click */
	readonly selector: string;
	/** Optional: wait for this selector after clicking */
	readonly waitFor?: string;
}

/**
 * Maps operation names to UI interactions.
 */
export type UiMappings = Record<string, UiInteraction>;

/**
 * Safely convert a value to string.
 */
export const stringify = (value: unknown): string => {
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return JSON.stringify(value);
};

/**
 * Fill a form field with the appropriate method based on element type.
 */
export const fillFormField = async (
	page: Page,
	selector: string,
	value: unknown,
): Promise<void> => {
	const element = page.locator(selector);

	// Try to determine element type from selector or by checking attributes
	// Use try/catch for each method to gracefully handle different element types
	const inputType = await element.getAttribute("type");

	/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access -- Playwright runs callback in browser context */
	const tagName = (await element
		.first()
		.evaluate((element_) => element_.tagName)) as string;
	/* eslint-enable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */

	if (tagName.toLowerCase() === "select") {
		await element.selectOption(stringify(value));
	} else if (inputType === "checkbox") {
		await (value ? element.check() : element.uncheck());
	} else {
		await element.fill(stringify(value));
	}
};

/**
 * Interpolate path placeholders (:param or {param}).
 * Also handles common aliases like {id} -> todoId/userId.
 */
export const interpolatePath = (
	path: string,
	params: Record<string, unknown>,
): string => {
	let result = path;
	for (const [key, value] of Object.entries(params)) {
		// Handle both :param and {param} formats
		result = result.replaceAll(`:${key}`, stringify(value));
		result = result.replaceAll(`{${key}}`, stringify(value));
		// Handle {id} -> entityId alias (e.g., todoId, userId)
		if (key.endsWith("Id")) {
			result = result.replaceAll("{id}", stringify(value));
		}
	}
	return result;
};

/**
 * Execute a UI interaction and extract the result.
 * Injectable params are skipped when filling form fields (they don't exist in the UI).
 */
export const executeUiInteraction = async (
	page: Page,
	baseUrl: string,
	mapping: UiInteraction,
	params: Record<string, unknown>,
	injectableParamNames: readonly string[] = [],
): Promise<unknown> => {
	const injectableSet = new Set(injectableParamNames);
	// Navigate if specified
	if (mapping.navigateTo) {
		const url = interpolatePath(mapping.navigateTo, params);
		await page.goto(`${baseUrl}${url}`);
		// Use 'load' instead of 'networkidle' since SSE connections prevent idle state
		await page.waitForLoadState("load");
	}

	// Fill and submit form
	if (mapping.form) {
		const formUrl = interpolatePath(mapping.form.route, params);
		await page.goto(`${baseUrl}${formUrl}`);
		await page.waitForLoadState("load");

		// Fill form fields (skip injectable params - they don't have form fields)
		for (const [paramName, selector] of Object.entries(mapping.form.fields)) {
			// Skip injectable params - their fields don't exist in the form
			if (injectableSet.has(paramName)) {
				continue;
			}
			const value = params[paramName];
			if (value !== undefined) {
				await fillFormField(page, selector, value);
			}
		}

		// Submit form and wait for navigation (HTMX uses HX-Redirect)
		const currentUrl = page.url();
		await page.click(mapping.form.submitButton);
		// Wait for URL to change (HTMX redirect) with short timeout
		await page
			.waitForURL((url) => url.href !== currentUrl, { timeout: 3000 })
			.catch(() => {
				// If no redirect happens within timeout, continue (some forms don't redirect)
			});
		await page.waitForLoadState("load");
	}

	// Click action
	if (mapping.click) {
		const currentUrl = page.url();
		await page.click(mapping.click.selector);
		if (mapping.click.waitFor) {
			await page.waitForSelector(mapping.click.waitFor);
		}
		// Wait for HTMX redirect (HX-Redirect triggers client-side navigation)
		// If URL changes, wait for new page to load; otherwise just wait for load state
		await page
			.waitForURL((url) => url.href !== currentUrl, { timeout: 3000 })
			.catch(() => {
				// If no redirect happens within timeout, continue
				// HTMX may redirect to the same URL - wait for network to settle
			});
		await page.waitForLoadState("load");
		// Brief wait for HTMX to process response and update DOM
		await page.waitForTimeout(100);
	}

	// Extract result
	return extractResult(page, mapping.extractResult);
};
