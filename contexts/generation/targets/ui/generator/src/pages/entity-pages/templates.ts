/**
 * Entity page template generators - list, create, detail, edit.
 */
import type {
	CommandDef,
	DomainSchema,
	OperationDef,
	QualifiedEntry,
} from "@morph/domain-schema";

import { joinLines, sep, toKebabCase } from "@morph/utils";

import type { BooleanToggle, ClassifiedAttribute } from "../../utilities";
import type { EntityPageContext } from "./context";

import { generateFormFields } from "../../forms";
import { extractActionVerb, getInjectableParamNames } from "../../utilities";

const generateActionButton = (
	cmd: QualifiedEntry<CommandDef>,
	entityName: string,
	pluralName: string,
	extraAttributes = "",
): string => {
	const actionKebab = toKebabCase(extractActionVerb(cmd.name, entityName));
	return `<button hx-post="/${pluralName}/\${item.id}/${actionKebab}" hx-target="#main-content" hx-select="#main-content" hx-swap="outerHTML"${extraAttributes} class="outline ${actionKebab}">\${t("op.${cmd.name}")}</button>`;
};

const formatToggleCell = (
	toggle: BooleanToggle,
	attribute: ClassifiedAttribute,
	entityName: string,
	pluralName: string,
): string => {
	const actionKebab = toKebabCase(
		extractActionVerb(toggle.command.name, entityName),
	);
	const disabledAttr = toggle.hasReverse
		? ""
		: `\${item.${attribute.name} ? " disabled" : ""}`;
	return `<td><input type="checkbox" role="switch" \${item.${attribute.name} ? "checked" : ""} hx-post="/${pluralName}/\${item.id}/${actionKebab}" hx-target="#main-content" hx-select="#main-content" hx-swap="outerHTML"${disabledAttr}></td>`;
};

const formatCell = (attribute: ClassifiedAttribute): string => {
	switch (attribute.category) {
		case "array": {
			return `\${formatArray(item.${attribute.name})}`;
		}
		case "boolean": {
			return `\${formatBoolean(item.${attribute.name})}`;
		}
		case "date": {
			return `\${formatDate(item.${attribute.name})}`;
		}
		case "enum":
		case "text": {
			return `\${formatValue(item.${attribute.name})}`;
		}
	}
};

export const generateListPage = (
	context: EntityPageContext,
	sseOptions: string,
): string => {
	const {
		entityName,
		pluralName,
		titleField,
		listColumns,
		actionCommands,
		booleanToggles,
		entityKey,
	} = context;

	const toggleCommandNames = new Set(booleanToggles.map((t) => t.command.name));
	const nonToggleCommands = actionCommands.filter(
		(cmd) => !toggleCommandNames.has(cmd.name),
	);

	const listActionButtons = joinLines(
		nonToggleCommands.map((cmd) =>
			generateActionButton(cmd, entityName, pluralName),
		),
		6,
	);

	const columnHeaders = joinLines(
		listColumns.map((c) => `<th>\${t("field.${entityKey}.${c.name}")}</th>`),
		5,
	);

	const columnCells = joinLines(
		listColumns.map((c) => {
			if (c.name === titleField) {
				return `<td><strong><a href="/${pluralName}/\${item.id}">${formatCell(c)}</a></strong></td>`;
			}
			const toggle = booleanToggles.find((t) => t.attribute === c.name);
			if (toggle) {
				return formatToggleCell(toggle, c, entityName, pluralName);
			}
			return `<td>${formatCell(c)}</td>`;
		}),
		5,
	);

	const actionButtonsHtml = listActionButtons
		? `${listActionButtons}${sep(6)}`
		: "";

	return `
/**
 * List page for ${entityName}.
 */
export const list${entityName}Page = (items: readonly ${entityName}[]): string => layout(
	t("entity.${entityKey}.plural"),
	\`<article>
		<header>
			<h2>\${t("entity.${entityKey}.plural")}</h2>
			<a href="/${pluralName}/new" role="button">\${t("action.create")}</a>
		</header>
		\${items.length === 0 ? \`<p>\${t("ui.emptyState", { entity: t("entity.${entityKey}.plural").toLowerCase() })}</p>
		<a href="/${pluralName}/new" role="button">\${t("ui.emptyStateAction")}</a>\` : \`<table role="grid">
			<thead>
				<tr>
					${columnHeaders}
					<th>\${t("action.actions")}</th>
				</tr>
			</thead>
			<tbody id="${entityKey}-list">
				\${items.map(item => \`<tr id="${entityKey}-\${item.id}">
					${columnCells}
					<td><nav>
						${actionButtonsHtml}<button
							data-confirm-message="\${t("confirm.deleteEntity", { entity: t("entity.${entityKey}.singular").toLowerCase() })}"
							onclick="confirmDelete('/${pluralName}/\${item.id}', this.dataset.confirmMessage, '${entityKey}-\${item.id}')"
							class="outline contrast"
						>\${t("action.delete")}</button>
					</nav></td>
				</tr>\`).join("")}
			</tbody>
		</table>\`}
	</article>\`,
	nav("/${pluralName}")${sseOptions},
);`;
};

export const generateCreatePage = (
	context: EntityPageContext,
	createOp: QualifiedEntry<OperationDef>,
	schema: DomainSchema,
	sseOptions: string,
): string => {
	const { entityName, pluralName, entityKey } = context;
	const injectableParams = getInjectableParamNames(schema, createOp.name);
	const formFields = generateFormFields(createOp, injectableParams, entityKey);

	return `
/**
 * Create page for ${entityName}.
 */
export const create${entityName}Page = (): string => layout(
	t("op.${createOp.name}"),
	\`<article>
		<header><h2>\${t("op.${createOp.name}")}</h2></header>
		<form hx-post="/${pluralName}/new" hx-target="#main-content" hx-select="#main-content" hx-swap="outerHTML" hx-push-url="true">
			${formFields}
			<button type="submit">\${t("op.${createOp.name}")}</button>
		</form>
	</article>\`,
	nav("/${pluralName}")${sseOptions},
);`;
};

export const generateDetailPage = (
	context: EntityPageContext,
	hasUpdateOp: boolean,
	sseOptions: string,
): string => {
	const {
		entityName,
		pluralName,
		titleField,
		detailFields,
		actionCommands,
		booleanToggles,
		entityKey,
	} = context;

	const hasCreatedAt = detailFields.metadata.some(
		(a) => a.name === "createdAt",
	);

	const toggleCommandNames = new Set(booleanToggles.map((t) => t.command.name));
	const nonToggleCommands = actionCommands.filter(
		(cmd) => !toggleCommandNames.has(cmd.name),
	);

	const editButton = hasUpdateOp
		? `<a href="/${pluralName}/\${item.id}/edit" role="button" class="outline">\${t("action.edit")}</a>`
		: "";

	const detailActionButtons = joinLines(
		nonToggleCommands.map((cmd) =>
			generateActionButton(cmd, entityName, pluralName, ' hx-push-url="true"'),
		),
		4,
	);

	const primaryFields = joinLines(
		detailFields.primary
			.filter((c) => c.name !== titleField)
			.map((c) => {
				const toggle = booleanToggles.find((t) => t.attribute === c.name);
				if (toggle) {
					const actionKebab = toKebabCase(
						extractActionVerb(toggle.command.name, entityName),
					);
					const disabledAttr = toggle.hasReverse
						? ""
						: `\${item.${c.name} ? " disabled" : ""}`;
					return `<dt>\${t("field.${entityKey}.${c.name}")}</dt><dd><input type="checkbox" role="switch" \${item.${c.name} ? "checked" : ""} hx-post="/${pluralName}/\${item.id}/${actionKebab}" hx-target="#main-content" hx-select="#main-content" hx-swap="outerHTML" hx-push-url="true"${disabledAttr}></dd>`;
				}
				return `<dt>\${t("field.${entityKey}.${c.name}")}</dt><dd>${formatCell(c)}</dd>`;
			}),
		3,
	);

	const metadataItems = hasCreatedAt
		? detailFields.metadata.filter((a) => a.name !== "createdAt")
		: detailFields.metadata;

	const metadataFields =
		metadataItems.length > 0
			? joinLines(
					metadataItems.map(
						(c) =>
							`<dt>\${t("field.${entityKey}.${c.name}")}</dt><dd>${formatCell(c)}</dd>`,
					),
					4,
				)
			: "";

	const metadataSection = metadataFields
		? `
		<details>
			<summary>\${t("ui.metadata")}</summary>
			<dl>
				${metadataFields}
			</dl>
		</details>`
		: "";

	return `
/**
 * Detail page for ${entityName}.
 */
export const view${entityName}Page = (item: ${entityName}): string => layout(
	item.${titleField},
	\`<article>
		<header>
			${
				hasCreatedAt
					? `<hgroup>
				<h2>\${item.${titleField}}</h2>
				<p>\${formatDate(item.createdAt)}</p>
			</hgroup>`
					: `<h2>\${item.${titleField}}</h2>`
			}
			<nav>
				${detailActionButtons ? `${detailActionButtons}${sep(4)}` : ""}${editButton}
				<button
					data-confirm-message="\${t("confirm.deleteEntity", { entity: t("entity.${entityKey}.singular").toLowerCase() })}"
					onclick="confirmDelete('/${pluralName}/\${item.id}', this.dataset.confirmMessage, null, '/${pluralName}')"
					class="outline contrast"
				>\${t("action.delete")}</button>
			</nav>
		</header>
		<dl>
			${primaryFields}
		</dl>${metadataSection}
		<footer>
			<a href="/${pluralName}">\${t("nav.backToList")}</a>
		</footer>
	</article>\`,
	nav("/${pluralName}")${sseOptions},
);`;
};

export const generateEditPage = (
	context: EntityPageContext,
	updateOp: QualifiedEntry<OperationDef>,
	schema: DomainSchema,
	sseOptions: string,
): string => {
	const { entityName, pluralName, titleField, entityKey } = context;
	const updateInjectableParams = getInjectableParamNames(schema, updateOp.name);
	const formFields = generateFormFields(
		updateOp,
		updateInjectableParams,
		entityKey,
	);

	return `
/**
 * Edit page for ${entityName}.
 */
export const edit${entityName}Page = (item: ${entityName}): string => layout(
	t("action.edit") + " " + (item.${titleField} ?? "${entityName}"),
	\`<article>
		<header><h2>\${t("action.edit")} ${entityName}</h2></header>
		<form hx-put="/${pluralName}/\${item.id}" hx-target="#main-content" hx-select="#main-content" hx-swap="outerHTML" hx-push-url="true">
			${formFields}
			<div role="group">
				<button type="submit">\${t("action.save")}</button>
				<a href="/${pluralName}/\${item.id}" role="button" class="outline">\${t("action.cancel")}</a>
			</div>
		</form>
	</article>\`,
	nav("/${pluralName}")${sseOptions},
);`;
};
