/**
 * Navigation generation for UI.
 */
import type {
	EntityDef,
	FunctionDef,
	OperationDef,
	QualifiedEntry,
} from "@morph/domain-schema";

import { pluralize, toKebabCase, toTitleCase } from "@morph/utils";

/**
 * Generate navigation items for functions.
 */
export const generateFunctionNav = (
	funcs: readonly QualifiedEntry<FunctionDef>[],
): string => {
	return funcs
		.map((function_) => {
			const href = `/functions/${toKebabCase(function_.name)}`;
			const label = toTitleCase(function_.name);
			return `<li><a href="${href}"\${currentPath === "${href}" ? ' aria-current="page"' : ""}>${label}</a></li>`;
		})
		.join("\n");
};

/**
 * Generate navigation function from operations and functions.
 * Returns a function that accepts currentPath and marks the active link.
 */
export const generateNav = (
	ops: readonly QualifiedEntry<OperationDef>[],
	funcs: readonly QualifiedEntry<FunctionDef>[] = [],
	entities: readonly QualifiedEntry<EntityDef>[] = [],
): string => {
	// Get list operations for nav
	const listOps = ops.filter(
		(op) => op.name.startsWith("list") || op.name.startsWith("getAll"),
	);

	const navItems = listOps.map((op) => {
		const entityPlural = op.name.replace(/^(?:list|getAll)/, "");
		const href = `/${entityPlural.toLowerCase()}`;
		const entity = entities.find(
			(ent) => entityPlural.toLowerCase() === pluralize(ent.name.toLowerCase()),
		);
		const entityKey = entity?.name.toLowerCase() ?? entityPlural.toLowerCase();
		return `<li><a href="${href}"\${currentPath?.startsWith("${href}") ? ' aria-current="page"' : ""}>\${t("entity.${entityKey}.plural")}</a></li>`;
	});

	const functionNav = generateFunctionNav(funcs);
	const allNavItems = [...navItems, functionNav].filter(Boolean).join("\n");

	if (!allNavItems)
		return `export const nav = (_currentPath?: string): string => "";`;

	// Only import t when entity nav items use translations
	const needsTImport = navItems.length > 0;
	const tImport = needsTImport ? 'import { t } from "./text";\n\n' : "";

	return `/**
 * Navigation component.
 */
${tImport}export const nav = (currentPath?: string): string => \`${allNavItems}\`;
`;
};
