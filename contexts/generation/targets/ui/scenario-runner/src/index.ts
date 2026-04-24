/**
 * Morph Test Runner - UI
 *
 * Tests generated HTMX web UIs via Playwright browser automation.
 * Uses the same scenario format as library, CLI, and API runners.
 */
import type { Prose, Runner } from "@morphdsl/scenario-runner";
import type {
	ServerConfig,
	ServerInstance,
} from "@morphdsl/scenario-runner-api";

import { createRunner } from "@morphdsl/scenario-runner";
import { startServer } from "@morphdsl/scenario-runner-api";

import type { BrowserManager } from "./browser";
import type { UiMappings } from "./interaction";

import { createBrowserManager } from "./browser";
import { executeUiInteraction } from "./interaction";

/**
 * Configuration for the UI test runner.
 */
export interface UiRunnerConfig {
	/** API server configuration (UI depends on API) */
	readonly apiServer: ServerConfig;
	/** Browser type to use (default: chromium) */
	readonly browser?: "chromium" | "firefox" | "webkit";
	/** Environment variable prefix for the app (e.g., "PASTEBIN_APP" -> PASTEBIN_APP_API_URL) */
	readonly envPrefix?: string;
	/** Run browser in headless mode (default: true) */
	readonly headless?: boolean;
	/**
	 * Injectable params per operation (auto-filled by API from session).
	 * These params won't appear in forms and shouldn't fail when undefined.
	 */
	readonly injectableParams?: Readonly<Record<string, readonly string[]>>;
	/** Prose templates for human-readable output */
	readonly prose?: Prose;
	/** State reset strategy between scenarios */
	readonly reset?: "none" | "restart";
	/** UI server configuration */
	readonly server: ServerConfig;
	/** Operation to UI interaction mappings */
	readonly uiMappings: UiMappings;
}

/**
 * Create a UI test runner.
 */
export const createUiRunner = (config: UiRunnerConfig): Runner => {
	const resetStrategy = config.reset ?? "restart";
	const browserType = config.browser ?? "chromium";
	const headless = config.headless ?? true;

	let apiServer: ServerInstance | undefined;
	let uiServer: ServerInstance | undefined;
	let browserManager: BrowserManager | undefined;

	const ensureServers = async (): Promise<{
		api: ServerInstance;
		ui: ServerInstance;
	}> => {
		apiServer ??= await startServer(config.apiServer);

		if (!uiServer) {
			const apiUrlEnvironmentVariable = config.envPrefix
				? `${config.envPrefix}_API_URL`
				: "API_URL";

			const uiConfig = {
				...config.server,
				env: {
					...config.server.env,
					[apiUrlEnvironmentVariable]: apiServer.baseUrl,
				},
			};
			uiServer = await startServer(uiConfig);
		}

		return { api: apiServer, ui: uiServer };
	};

	const ensureBrowser = async (): Promise<BrowserManager> => {
		browserManager ??= await createBrowserManager({
			browser: browserType,
			headless,
		});
		return browserManager;
	};

	const stopAll = async (): Promise<void> => {
		if (browserManager) {
			await browserManager.stop();
			browserManager = undefined;
		}
		if (uiServer) {
			uiServer.stop();
			uiServer = undefined;
		}
		if (apiServer) {
			apiServer.stop();
			apiServer = undefined;
		}
	};

	const resetBetweenScenarios = async (): Promise<void> => {
		if (resetStrategy === "restart") {
			await stopAll();
		} else if (browserManager) {
			await browserManager.resetContext();
		}
	};

	return createRunner(
		{
			execute: async (name, params) => {
				const servers = await ensureServers();
				const browser = await ensureBrowser();
				const page = browser.getPage();

				const mapping = config.uiMappings[name];
				if (!mapping) {
					throw new Error(`No UI mapping for operation: ${name}`);
				}

				const opInjectableParams = config.injectableParams?.[name] ?? [];

				const result = await executeUiInteraction(
					page,
					servers.ui.baseUrl,
					mapping,
					params,
					opInjectableParams,
				);

				return { result };
			},
			prose: config.prose,
		},
		{
			cleanup: stopAll,
			reset: resetBetweenScenarios,
		},
	);
};

// Re-export types from submodules
export type {
	ClickAction,
	FormAction,
	UiInteraction,
	UiMappings,
} from "./interaction";
export type {
	DlExtractor,
	JsonExtractor,
	ResultExtractor,
	TableExtractor,
	TextExtractor,
	UrlExtractor,
} from "./extraction";
