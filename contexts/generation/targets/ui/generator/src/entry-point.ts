/**
 * Entry point generation for UI server.
 */
import { schemaHasAuthRequirement } from "@morphdsl/domain-schema";
import { separator, toKebabCase } from "@morphdsl/utils";

import type { GenerateUiAppOptions } from "./config";

import { buildEntryRoutes } from "./entry-routes";
import { generateStylesModule } from "./styles";

/**
 * Generate the main entry point (index.ts).
 */
export const generateEntryPoint = (options: GenerateUiAppOptions): string => {
	const { clientPackagePath, dslPackagePath, envPrefix = "APP" } = options;
	const hasAuth = schemaHasAuthRequirement(options.schema);

	const { authRoutes, pageImports, routeHandlers, sessionCode, typeImports } =
		buildEntryRoutes(options);

	// Home page handler
	const homeHandler = hasAuth
		? `(request: Request) => {
				initLanguage(request);
				const authState = getAuthState(request);
				return html(homePage(authState));
			}`
		: `(request: Request) => {
				initLanguage(request);
				return html(homePage());
			}`;

	const storageKey = toKebabCase(options.appName);

	const cssContent = generateStylesModule();
	// Escape backticks and backslashes for embedding in template literal
	const cssEscaped = cssContent
		.replaceAll("\\", "\\\\")
		.replaceAll("`", "\\`")
		.replaceAll("$", String.raw`\$`);

	return `/**
 * UI Server Entry Point
 *
 * Bun.serve() with HTMX routes. Uses the typed HTTP client
 * to communicate with the API server.
 */
import { createClient } from "${clientPackagePath}";
${typeImports.length > 0 ? `import type { ${typeImports.join(", ")} } from "${dslPackagePath}";\n` : ""}import { Effect } from "effect";

import {
	${pageImports.join(separator(1, ","))},
} from "./pages";
import { setLanguage, t } from "./text";
${sessionCode}
const morphCss = \`${cssEscaped}\`;
// Create typed HTTP client pointing to API server
const client = createClient({
	baseUrl: process.env["${envPrefix}_API_URL"] ?? "http://localhost:3000",
});

// Language cookie name
const LANG_COOKIE = "${storageKey}_lang";

// Extract language from cookie and set it for the current request
const initLanguage = (request: Request): void => {
	const cookies = request.headers.get("Cookie") ?? "";
	const match = new RegExp(LANG_COOKIE + "=([^;]+)").exec(cookies);
	if (match?.[1]) {
		setLanguage(match[1]);
	}
};

const html = (content: string): Response =>
	new Response(content, {
		headers: { "Content-Type": "text/html; charset=utf-8" },
	});

const server = Bun.serve({
	port: Number(process.env["PORT"] ?? 4000),
	routes: {
		// Static assets
		"/morph.css": new Response(morphCss, { headers: { "Content-Type": "text/css" } }),
		// Home page
		"/": { GET: ${homeHandler} },
${authRoutes}
${routeHandlers.join("\n")}
	},
});

console.info(\`UI server running on http://localhost:\${server.port}\`);

// Graceful shutdown on SIGTERM/SIGINT (12-factor: disposability)
const shutdown = () => {
	console.info("UI server shutting down...");
	void server.stop(true).then(() => {
		console.info("UI server stopped");
		// eslint-disable-next-line unicorn/no-process-exit -- Graceful shutdown
		process.exit(0);
	});
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
`;
};
