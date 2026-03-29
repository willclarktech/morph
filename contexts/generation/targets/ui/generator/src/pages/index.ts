/**
 * Page generation for UI.
 */
import type {
	DomainSchema,
	EntityDef,
	QualifiedEntry,
} from "@morphdsl/domain-schema";

import {
	getAllEntities,
	getAllFunctions,
	getAllOperations,
} from "@morphdsl/domain-schema";
import { pluralize } from "@morphdsl/utils";

import type { AuthOperations } from "../auth/detection";
import type { UiConfig } from "../config";

import { generateAuthPages } from "./auth-pages";
import { generateEntityPages } from "./entity-pages";
import { generateFunctionPages } from "./function-pages";

/**
 * Generate the home page template.
 */
const generateHomePage = (
	entities: readonly QualifiedEntry<EntityDef>[],
	hasAuth: boolean,
	sseOptionsAfterAuth: string,
	sseOptions: string,
): string => {
	const quickLinks = entities
		.map((ent) => {
			const pluralName = pluralize(ent.name.toLowerCase());
			const entityKey = ent.name.toLowerCase();
			return `<a href="/${pluralName}" role="button" class="outline">\${t("entity.${entityKey}.plural")}</a>`;
		})
		.join("\n\t\t\t");

	const quickLinksSection = quickLinks
		? `\n\t\t<div role="group">\n\t\t\t${quickLinks}\n\t\t</div>`
		: "";

	return `
/**
 * Home page with links to all entity lists.
 */
export const homePage = (${hasAuth ? "authState: AuthState" : ""}): string => layout(
	t("nav.home"),
	\`<article>
		<header><h2>\${t("status.welcome")}${hasAuth ? `, \${authState.userName ?? t("auth.user")}` : ""}</h2></header>
		<p>\${t("ui.homeDescription")}</p>${quickLinksSection}
	</article>\`,
	nav("/")${hasAuth ? ",\n\tauthState" : ""}${hasAuth ? sseOptionsAfterAuth : sseOptions},
);`;
};

/**
 * Generate the error alert template.
 */
const generateErrorAlert = (): string => `
/**
 * Inline error alert for displaying error messages.
 */
export const errorAlert = (message: string): string =>
	\`<p role="alert" aria-invalid="true">\${message}</p>\`;
`;

const allFormatters = [
	"formatArray",
	"formatBoolean",
	"formatDate",
	"formatValue",
] as const;

/**
 * Generate import statements for the pages module.
 * Only imports formatters and entity types that are actually used in the generated pages.
 */
const generateImports = (
	entityImports: readonly string[],
	hasAuth: boolean,
	pagesContent: string,
): string => {
	const layoutImports = "layout";
	const layoutTypeImport = hasAuth
		? `import type { AuthState } from "./layout";\n`
		: "";
	const usedFormatters = allFormatters.filter((f) => pagesContent.includes(f));
	const usedEntities = entityImports.filter(
		(name) =>
			pagesContent.includes(`: ${name}`) ||
			pagesContent.includes(`: readonly ${name}[]`),
	);

	const formatterImport =
		usedFormatters.length > 0
			? `import { ${usedFormatters.join(", ")} } from "./formatters";\n`
			: "";

	return `${formatterImport}${layoutTypeImport}import { ${layoutImports} } from "./layout";
import { nav } from "./nav";
import { t } from "./text";
${usedEntities.length > 0 ? `import type { ${usedEntities.join(", ")} } from "@PLACEHOLDER_DSL";` : ""}`;
};

/**
 * Generate the pages module.
 */
export const generatePages = (
	schema: DomainSchema,
	_config: UiConfig = {},
	hasAuth = false,
	authOps?: AuthOperations,
	hasEvents = false,
): string => {
	const resolvedAuthOps = authOps ?? { login: undefined, register: undefined };
	const sseOptions = hasEvents
		? hasAuth
			? ", undefined, { apiUrl, enableSse: true }"
			: ", { apiUrl, enableSse: true }"
		: "";
	const sseOptionsAfterAuth = hasEvents ? ", { apiUrl, enableSse: true }" : "";

	const entities = getAllEntities(schema);
	const ops = getAllOperations(schema).filter((op) =>
		op.def.tags.includes("@ui"),
	);
	const functions = getAllFunctions(schema);

	const pages: string[] = [];

	pages.push(...generateEntityPages(schema, entities, sseOptions));

	if (hasAuth) {
		pages.push(...generateAuthPages(resolvedAuthOps, sseOptions));
	}

	pages.push(...generateFunctionPages(functions, sseOptions));

	const homeEntities = entities.filter((ent) =>
		ops.some(
			(op) =>
				(op.name.startsWith("list") || op.name.startsWith("getAll")) &&
				op.name.toLowerCase().includes(ent.name.toLowerCase()),
		),
	);

	pages.unshift(
		generateHomePage(homeEntities, hasAuth, sseOptionsAfterAuth, sseOptions),
	);
	pages.push(generateErrorAlert());

	const entityImports = entities
		.filter((ent) =>
			ops.some((op) => op.name.toLowerCase().includes(ent.name.toLowerCase())),
		)
		.map((ent) => ent.name);

	const apiUrlConstant = hasEvents
		? `\n// API URL for SSE connections (from environment or default)\nconst apiUrl = process.env["@PLACEHOLDER_APP_NAME_API_URL"] ?? "http://localhost:3000";\n`
		: "";

	const pagesContent = pages.join("\n");

	return `${generateImports(entityImports, hasAuth, pagesContent)}
${apiUrlConstant}
${pagesContent}
`;
};
