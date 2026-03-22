/**
 * Auth page generation - login, register templates.
 */
import type { AuthOperations } from "../auth/detection";

import { generateFormFields } from "../forms";

/**
 * Generate the login page template.
 */
const generateLoginPage = (
	hasRegister: boolean,
	sseOptions: string,
): string => {
	const registerLink = hasRegister
		? `\n\t\t<p>\${t("auth.noAccount")} <a href="/register">\${t("auth.register")}</a></p>`
		: "";

	return `
/**
 * Login page.
 */
export const loginPage = (error?: string): string => layout(
	t("auth.login"),
	\`<article>
		<header><h2>\${t("auth.login")}</h2></header>
		\${error ? \`<p role="alert" aria-invalid="true">\${error}</p>\` : ""}
		<form method="POST" action="/login">
			<label for="email">\${t("field.auth.email")}</label>
			<input type="email" name="email" id="email" required>
			<label for="password">\${t("field.auth.password")}</label>
			<input type="password" name="password" id="password" required>
			<button type="submit">\${t("auth.login")}</button>
		</form>${registerLink}
	</article>\`,
	nav()${sseOptions},
);`;
};

/**
 * Generate the registration page template.
 */
const generateRegisterPage = (
	registerOp: NonNullable<AuthOperations["register"]>,
	sseOptions: string,
): string => {
	const registerFields = generateFormFields(registerOp, new Set(), "user");

	return `
/**
 * Registration page.
 */
export const registerPage = (error?: string): string => layout(
	t("auth.register"),
	\`<article>
		<header><h2>\${t("auth.register")}</h2></header>
		\${error ? \`<p role="alert" aria-invalid="true">\${error}</p>\` : ""}
		<form method="POST" action="/register">
			${registerFields}
			<button type="submit">\${t("auth.register")}</button>
		</form>
		<p>\${t("auth.hasAccount")} <a href="/login">\${t("auth.login")}</a></p>
	</article>\`,
	nav()${sseOptions},
);`;
};

/**
 * Generate auth pages (login and optionally register).
 */
export const generateAuthPages = (
	authOps: AuthOperations,
	sseOptions: string,
): readonly string[] => {
	const pages: string[] = [];

	pages.push(generateLoginPage(!!authOps.register, sseOptions));

	if (authOps.register) {
		pages.push(generateRegisterPage(authOps.register, sseOptions));
	}

	return pages;
};
