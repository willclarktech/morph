/**
 * Morph UI Generator
 *
 * Generate HTMX + Pico CSS web UIs from domain schemas.
 * Uses the typed HTTP client to communicate with the API server.
 */
import type { GeneratedFile, GenerationResult } from "@morph/domain-schema";

import { TEXT } from "@morph/auth-password-impls";
import {
	deriveRequiredKeys,
	getAllEntities,
	getAllFunctions,
	getAllOperations,
	getCommandsWithEvents,
	schemaHasAuthRequirement,
} from "@morph/domain-schema";
import { toKebabCase } from "@morph/utils";

import type { GenerateUiAppOptions } from "./config";

import { detectAuthOperations } from "./auth/detection";
import { generateEntryPoint } from "./entry-point";
import { generateFormattersModule } from "./formatters";
import { generateTextModule, generateTextTypesModule } from "./i18n";
import { generateLayout, generateSettingsModule } from "./layout";
import { generateNav } from "./nav";
import { generatePages } from "./pages";
import { generateReadme } from "./readme";
import { generateSessionModule } from "./session-gen";
import { SYSTEM_TEXT } from "./system-text";

export { generateUiPackageJson } from "./package-json";

/**
 * Generate the UI application files.
 */
export const generate = (options: GenerateUiAppOptions): GenerationResult => {
	const packageDir = options.packageDir ?? "apps/ui";
	const sourceDir = options.sourceDir ?? "src";
	const prefix = `${packageDir}/${sourceDir}/`;
	const uiName = options.uiName ?? "ui";
	const apiUrl = options.apiUrl ?? "http://localhost:3000";
	const hasAuth = schemaHasAuthRequirement(options.schema);
	const hasEvents = getCommandsWithEvents(options.schema).length > 0;
	const storageKey = toKebabCase(options.appName);
	const entities = getAllEntities(options.schema);

	const files: GeneratedFile[] = [];

	// Formatters (display helpers)
	files.push({
		content: generateFormattersModule(),
		filename: `${prefix}formatters.ts`,
	});

	// Settings (required by text module)
	files.push({
		content: generateSettingsModule(),
		filename: `${prefix}settings.ts`,
	});

	// Text/i18n module
	files.push({
		content: generateTextModule(
			options.schema,
			options.i18nConfig,
			options.textConfig,
			hasAuth,
			options.uiConfig?.text,
		),
		filename: `${prefix}text.ts`,
	});

	// Text types (when i18nConfig is provided)
	if (options.i18nConfig) {
		// Collect all text keys from all sources
		const systemKeys = Object.keys(SYSTEM_TEXT);
		const authKeys = hasAuth ? Object.keys(TEXT) : [];
		const domainKeys = options.textConfig
			? Object.keys(options.textConfig.domain)
			: deriveRequiredKeys(options.schema);
		const overrideKeys = options.textConfig?.overrides
			? Object.keys(options.textConfig.overrides)
			: [];

		const allKeys = [
			...new Set([...authKeys, ...domainKeys, ...overrideKeys, ...systemKeys]),
		].sort();

		files.push({
			content: generateTextTypesModule(options.i18nConfig, allKeys),
			filename: `${prefix}text-types.ts`,
		});
	}

	// Layout
	files.push({
		content: generateLayout(
			options.appName,
			options.uiConfig,
			apiUrl,
			hasAuth,
			storageKey,
		),
		filename: `${prefix}layout.ts`,
	});

	// Navigation
	const ops = getAllOperations(options.schema).filter((op) =>
		op.def.tags.includes("@ui"),
	);
	const uiFuncs = getAllFunctions(options.schema).filter((function_) =>
		function_.def.tags.includes("@ui"),
	);
	files.push({
		content: generateNav(ops, uiFuncs, entities),
		filename: `${prefix}nav.ts`,
	});

	// Detect auth operations for page generation
	const resolvedAuthOps = detectAuthOperations(ops);

	// Session store (only when auth is required)
	if (hasAuth) {
		files.push({
			content: generateSessionModule(),
			filename: `${prefix}session.ts`,
		});
	}

	// Pages
	let pagesContent = generatePages(
		options.schema,
		options.uiConfig,
		hasAuth,
		resolvedAuthOps,
		hasEvents,
	);
	// Replace placeholder with actual DSL package
	pagesContent = pagesContent.replace(
		"@PLACEHOLDER_DSL",
		options.dslPackagePath,
	);
	// Replace placeholder with actual env prefix (e.g., PASTEBIN_APP_API_URL)
	pagesContent = pagesContent.replace(
		"@PLACEHOLDER_APP_NAME_API_URL",
		`${options.envPrefix ?? "APP"}_API_URL`,
	);
	files.push({
		content: pagesContent,
		filename: `${prefix}pages.ts`,
	});

	// Entry point
	files.push({
		content: generateEntryPoint(options),
		filename: `${prefix}index.ts`,
	});

	// Config files - use uiName directly (already kebab-case, e.g. "pastebin-app")
	const name = uiName;
	files.push({
		content: `import { configs } from "@${name}/eslint-config";

export default configs.generated;
`,
		filename: `${packageDir}/eslint.config.ts`,
	});

	files.push({
		content: `{
	"extends": "@${name}/tsconfig/base.json",
	"compilerOptions": {
		"rootDir": ".",
		"outDir": "dist"
	},
	"include": ["src"]
}
`,
		filename: `${packageDir}/tsconfig.json`,
	});

	// README
	const envPrefix = options.envPrefix ?? "APP";
	files.push({
		content: generateReadme(options.appName, envPrefix),
		filename: `${packageDir}/README.md`,
	});

	return { files };
};

export {
	type GenerateUiAppOptions,
	type UiBrand,
	type UiConfig,
	type UiTextConfig,
	type UiTheme,
} from "./config";
