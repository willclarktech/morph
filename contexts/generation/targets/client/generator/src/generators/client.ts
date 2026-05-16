/**
 * Generate typed HTTP client from domain schema.
 */

import type { DomainSchema, OperationDef } from "@morphdsl/domain-schema";

import {
	conditionReferencesCurrentUser,
	contextNameToKebab,
	getAllFunctions,
	getAllOperations,
	getOperationPreInvariantDefs,
} from "@morphdsl/domain-schema";
import { sortImports } from "@morphdsl/utils";

import { generateClientFactory } from "./implementation";
import {
	collectErrorImports,
	collectTypeImports,
	generateMultiContextTypeImports,
} from "./imports";
import { generateClientInterface } from "./interface";

/**
 * Generate a typed HTTP client from the domain schema.
 */
export const generate = (
	schema: DomainSchema,
	options: {
		readonly appName: string;
		readonly basePath?: string;
		readonly scope?: string;
	},
): string => {
	const { appName, basePath = "/api" } = options;
	const scope = options.scope ?? appName.toLowerCase();

	// Get operations (commands/queries) with @api tag
	const apiOps = getAllOperations(schema).filter((entry) =>
		entry.def.tags.includes("@api"),
	);

	// Get functions with @api tag - cast to OperationDef for client generation
	const apiFunctions = getAllFunctions(schema)
		.filter((f) => f.def.tags.includes("@api"))
		.map((f) => ({
			...f,
			def: f.def as unknown as OperationDef,
		}));

	// Combine operations and functions
	const apiOperations = [...apiOps, ...apiFunctions];

	// Bundled pure functions: no declared errors → core re-exports them at top
	// level as plain values. The client lib re-exports them so consumers can
	// call them directly without the HTTP round-trip. Functions also tagged
	// @api still get an HTTP method below — both paths are available.
	const bundledFunctions = getAllFunctions(schema)
		.filter((f) => f.def.errors.length === 0)
		.toSorted((a, b) => a.name.localeCompare(b.name));

	if (apiOperations.length === 0 && bundledFunctions.length === 0) {
		return "";
	}

	// Collect all types needed for imports, grouped by context
	const typeImports = collectTypeImports(apiOperations);
	const errorImports = collectErrorImports(apiOperations);
	const hasAuth = hasAuthOperations(schema, apiOperations);

	// Detect password-based auth for login method
	const authEntityName = getPasswordAuthEntity(schema);
	if (authEntityName) {
		// Find the context for the auth entity
		for (const [contextName, context] of Object.entries(schema.contexts)) {
			if (context.entities[authEntityName]) {
				const existing = typeImports.get(contextName) ?? new Set<string>();
				typeImports.set(contextName, existing);
				existing.add(authEntityName);
				break;
			}
		}
	}

	const factory =
		apiOperations.length > 0
			? generateClientFactory(
					apiOperations,
					schema,
					basePath,
					hasAuth,
					authEntityName,
				)
			: undefined;

	const httpValueImports =
		factory !== undefined
			? [
					...(hasAuth ? ["authHeaders"] : []),
					...(factory.needsJsonHeaders ? ["jsonHeaders"] : []),
					"request",
				].join(", ")
			: undefined;

	const importBlock =
		factory !== undefined
			? sortImports(
					[
						'import type { ClientConfig, HttpClientError } from "@morphdsl/http-client";',
						'import type { Effect } from "effect";',
						`import { ${String(httpValueImports)} } from "@morphdsl/http-client";`,
						generateMultiContextTypeImports(scope, typeImports, errorImports),
					]
						.filter(Boolean)
						.join("\n"),
				)
			: "";

	// Bundled-function re-exports — grouped by core package.
	const bundledByCore = new Map<string, string[]>();
	for (const entry of bundledFunctions) {
		const corePkg = `@${scope}/${contextNameToKebab(entry.context)}-core`;
		const existing = bundledByCore.get(corePkg) ?? [];
		existing.push(entry.name);
		bundledByCore.set(corePkg, existing);
	}
	const bundledReExports = [...bundledByCore.entries()]
		.toSorted(([a], [b]) => a.localeCompare(b))
		.map(
			([pkg, names]) =>
				`export { ${names.toSorted().join(", ")} } from "${pkg}";`,
		)
		.join("\n");

	const sections: string[] = ["// Generated HTTP Client"];
	if (importBlock) {
		sections.push("", importBlock);
	}
	if (bundledReExports) {
		sections.push(
			"",
			"// Pure functions bundled from core — call directly, no HTTP hop.",
			bundledReExports,
		);
	}
	if (factory !== undefined) {
		sections.push(
			"",
			generateClientInterface(apiOperations, schema, authEntityName),
			"",
			factory.code,
		);
	}

	return sections.join("\n") + "\n";
};

/**
 * Check if any operations require authentication.
 */
const hasAuthOperations = (
	schema: DomainSchema,
	operations: readonly { readonly def: OperationDef; readonly name: string }[],
): boolean => {
	for (const entry of operations) {
		const preInvariants = getOperationPreInvariantDefs(schema, entry.name);
		if (
			preInvariants.some((inv) => conditionReferencesCurrentUser(inv.condition))
		) {
			return true;
		}
	}
	return false;
};

/**
 * Detect password-based auth capability (entity with passwordHash + createUser with password).
 * Returns the auth entity name if found.
 */
const getPasswordAuthEntity = (schema: DomainSchema): string | undefined => {
	for (const [, context] of Object.entries(schema.contexts)) {
		for (const [entName, ent] of Object.entries(context.entities)) {
			if (ent.attributes["passwordHash"]) {
				// Check for createUser command with sensitive password
				for (const [cmdName, cmd] of Object.entries(context.commands)) {
					const passwordInput = cmd.input["password"];
					if (
						cmdName.toLowerCase().includes("create") &&
						cmdName.toLowerCase().includes(entName.toLowerCase()) &&
						passwordInput?.sensitive
					) {
						return entName;
					}
				}
			}
		}
	}
	return undefined;
};
