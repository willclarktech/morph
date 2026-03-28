/**
 * HTML layout generation for UI.
 */
import { configProperties, indent, separator } from "@morph/utils";

import type { UiConfig, UiTheme } from "./config";

/**
 * Generate the settings module for persisting UI preferences.
 */
export const generateSettingsModule = (): string => `/**
 * Settings module for server-side UI preferences.
 * Language is stored per-request via module state (set from cookie).
 */

/**
 * UI settings shape.
 */
export interface UiSettings {
	readonly language?: string;
}

/**
 * Current settings (module-level, set per request).
 */
let currentSettings: UiSettings = {};

/**
 * Load current settings.
 */
export const loadSettings = (): UiSettings => currentSettings;

/**
 * Save/update current settings.
 */
export const saveSettings = (settings: UiSettings): void => {
	currentSettings = settings;
};
`;

/**
 * Generate Pico CSS theme variables.
 */
export const generateThemeStyles = (theme: UiTheme = {}): string => {
	const variables: string[] = [];

	if (theme.primary) variables.push(`--pico-primary: ${theme.primary};`);
	if (theme.primaryHover)
		variables.push(`--pico-primary-hover: ${theme.primaryHover};`);
	if (theme.secondary) variables.push(`--pico-secondary: ${theme.secondary};`);
	if (theme.background)
		variables.push(`--pico-background-color: ${theme.background};`);
	if (theme.backgroundAlt)
		variables.push(`--pico-card-background-color: ${theme.backgroundAlt};`);
	if (theme.text) variables.push(`--pico-color: ${theme.text};`);
	if (theme.textMuted)
		variables.push(`--pico-muted-color: ${theme.textMuted};`);
	if (theme.borderRadius)
		variables.push(`--pico-border-radius: ${theme.borderRadius};`);
	if (theme.borderColor)
		variables.push(`--pico-muted-border-color: ${theme.borderColor};`);
	if (theme.fontFamily)
		variables.push(`--pico-font-family: ${theme.fontFamily};`);
	if (theme.fontSize) variables.push(`--pico-font-size: ${theme.fontSize};`);
	if (theme.cardShadow)
		variables.push(`--pico-card-box-shadow: ${theme.cardShadow};`);
	if (theme.buttonShadow)
		variables.push(`--pico-button-box-shadow: ${theme.buttonShadow};`);
	if (theme.lineHeight)
		variables.push(`--pico-line-height: ${theme.lineHeight};`);
	if (theme.primaryFocus)
		variables.push(`--pico-primary-focus: ${theme.primaryFocus};`);
	if (theme.spacing)
		variables.push(`--pico-block-spacing-vertical: ${theme.spacing};`);
	if (theme.transition)
		variables.push(`--pico-transition: ${theme.transition};`);

	if (variables.length === 0 && !theme.headingWeight) return "";

	const parts: string[] = [];

	if (variables.length > 0) {
		parts.push(`
	:root {
		${variables.join(separator(2))}
	}`);
	}

	if (theme.headingWeight) {
		parts.push(`
	h1, h2, h3 {
		font-weight: ${theme.headingWeight};
	}`);
	}

	return parts.join("\n");
};

/**
 * Generate the base HTML layout template.
 */
export const generateLayout = (
	appName: string,
	config: UiConfig = {},
	apiUrl: string,
	hasAuth: boolean,
	storageKey: string,
): string => {
	const colorScheme = config.theme?.colorScheme ?? "light";
	const themeStyles = generateThemeStyles(config.theme);

	// Auth state type and nav generation (only if auth is enabled)
	const authTypes = hasAuth
		? `
/**
 * Authentication state passed to layout.
 */
export interface AuthState {
	readonly isAuthenticated: boolean;
	readonly userName: string | undefined;
}

const defaultAuthState: AuthState = { isAuthenticated: false, userName: undefined };
`
		: "";

	// Build layout function parameters
	const layoutParams = configProperties([
		"title: string",
		"content: string",
		'nav = ""',
		hasAuth && "authState: AuthState = defaultAuthState",
		"options: LayoutOptions = {}",
	]);

	const authNav = hasAuth
		? `\${authState.isAuthenticated
				? \`<li><span>\${authState.userName ?? t("auth.user")}</span></li><li><a href="/logout">\${t("auth.logout")}</a></li>\`
				: \`<li><a href="/login">\${t("auth.login")}</a></li>\`}`
		: "";

	return `/**
 * Base HTML layout with Pico CSS and HTMX.
 */
import { t, getLanguages, getLanguage, getLanguageDisplayName } from "./text";
${authTypes}
/**
 * Layout options.
 */
export interface LayoutOptions {
	readonly apiUrl?: string;
	readonly enableSse?: boolean;
}

export const layout = (
${indent(layoutParams.join(",\n"), 1)},
): string => {
	const apiUrl = options.apiUrl ?? "${apiUrl}";
	const sseAttributes = options.enableSse ? \`hx-ext="sse" sse-connect="\${apiUrl}/api/events" sse-swap="event" hx-swap="afterbegin" hx-target="this"\` : "";
	const activitySection = options.enableSse ? \`<details><summary>\${t("ui.recentActivity")}</summary><ul id="activity-log" \${sseAttributes}></ul></details>\` : "";
	const languageOptions = getLanguages().map(lang =>
		\`<option value="\${lang}" \${lang === getLanguage() ? "selected" : ""}>\${getLanguageDisplayName(lang)}</option>\`
	).join("");
	return \`<!DOCTYPE html>
<html lang="\${getLanguage()}" data-theme="${colorScheme}">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>\${title} - ${appName}</title>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
	<link rel="stylesheet" href="/morph.css">
	<script src="https://unpkg.com/htmx.org@2.0.4"></script>
	<script src="https://unpkg.com/htmx-ext-sse@2.2.2/sse.js"></script>
	<style>${themeStyles}
		/* HTMX loading states */
		.htmx-request button[type="submit"] { pointer-events: none; opacity: 0.7; }
		#activity-log { max-height: 150px; overflow-y: auto; margin: 0; }
		#activity-log li { font-size: 0.875rem; }
	</style>
</head>
<body hx-boost="true" hx-target="#main-content" hx-select="#main-content" hx-swap="outerHTML" hx-push-url="true">
	<header class="container">
		<nav>
			<ul>
				<li><strong><a href="/">${appName}</a></strong></li>
			</ul>
			<ul>
				\${nav}
				<li>
					<select id="language-select" onchange="changeLanguage(this.value)" aria-label="\${t("ui.languageLabel")}">
						\${languageOptions}
					</select>
				</li>
				${authNav}
			</ul>
		</nav>
	</header>
	<main id="main-content" class="container">
		\${content}
	</main>
	\${activitySection ? \`<footer class="container">\${activitySection}</footer>\` : ""}
	<!-- Confirmation dialog -->
	<dialog id="confirm-dialog">
		<article>
			<header><h3>\${t("confirm.title")}</h3></header>
			<p id="confirm-message">\${t("confirm.delete")}</p>
			<footer>
				<button class="secondary" onclick="document.getElementById('confirm-dialog').close()">\${t("action.cancel")}</button>
				<button id="confirm-action" class="contrast">\${t("action.delete")}</button>
			</footer>
		</article>
	</dialog>
	<script>
		function confirmDelete(url, message, targetId, redirectTo) {
			const dialog = document.getElementById('confirm-dialog');
			document.getElementById('confirm-message').textContent = message;
			const btn = document.getElementById('confirm-action');
			btn.setAttribute('hx-delete', url);
			if (redirectTo) {
				btn.setAttribute('hx-swap', 'none');
				btn.removeAttribute('hx-target');
				btn.setAttribute('hx-on::after-request', "document.getElementById('confirm-dialog').close(); window.location.href = '" + redirectTo + "';");
			} else if (targetId) {
				btn.setAttribute('hx-target', '#' + targetId);
				btn.setAttribute('hx-swap', 'outerHTML swap:500ms');
				btn.setAttribute('hx-on::after-request', "document.getElementById('confirm-dialog').close();");
			}
			htmx.process(btn);
			dialog.showModal();
		}
		function changeLanguage(lang) {
			document.cookie = "${storageKey}_lang=" + lang + "; path=/; max-age=31536000; SameSite=Strict";
			location.reload();
		}
	</script>
</body>
</html>\`;
};
`;
};
