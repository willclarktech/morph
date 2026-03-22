/**
 * Generate typed HTTP client from domain schema.
 */

import type { DomainSchema, OperationDef } from "@morph/domain-schema";

import {
	conditionReferencesCurrentUser,
	getAllFunctions,
	getAllOperations,
	getOperationPreInvariantDefs,
} from "@morph/domain-schema";

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

	if (apiOperations.length === 0) {
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
				if (!typeImports.has(contextName)) {
					typeImports.set(contextName, new Set());
				}
				typeImports.get(contextName)!.add(authEntityName);
				break;
			}
		}
	}

	const sections = [
		"// Generated HTTP Client",
		"",
		'import type { Effect } from "effect";',
		"",
		'import { type ClientConfig, type HttpClientError, authHeaders, jsonHeaders, request } from "@morph/http-client";',
		"",
		generateMultiContextTypeImports(scope, typeImports, errorImports),
		"",
		generateClientInterface(apiOperations, schema, authEntityName),
		"",
		generateClientFactory(
			apiOperations,
			schema,
			basePath,
			hasAuth,
			authEntityName,
		),
	];

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
