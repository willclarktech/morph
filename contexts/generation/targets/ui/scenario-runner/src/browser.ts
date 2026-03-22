/**
 * Browser management for UI test runner.
 */
import type { Page } from "playwright";

import { chromium, firefox, webkit } from "playwright";

/**
 * Browser type options.
 */
export type BrowserType = "chromium" | "firefox" | "webkit";

/**
 * Browser configuration.
 */
export interface BrowserConfig {
	/** Browser type to use (default: chromium) */
	readonly browser?: BrowserType;
	/** Run browser in headless mode (default: true) */
	readonly headless?: boolean;
}

/**
 * Browser instance manager.
 */
export interface BrowserManager {
	readonly getPage: () => Page;
	readonly resetContext: () => Promise<void>;
	readonly stop: () => Promise<void>;
}

/**
 * Create a browser manager with the specified configuration.
 */
export const createBrowserManager = async (
	config: BrowserConfig,
): Promise<BrowserManager> => {
	const browserType = config.browser ?? "chromium";
	const headless = config.headless ?? true;

	const launcher =
		browserType === "firefox"
			? firefox
			: browserType === "webkit"
				? webkit
				: chromium;

	const browser = await launcher.launch({ headless });
	let context = await browser.newContext();
	let page = await context.newPage();

	return {
		getPage: () => page,
		resetContext: async () => {
			await context.close();
			context = await browser.newContext();
			page = await context.newPage();
		},
		stop: async () => {
			await browser.close();
		},
	};
};
