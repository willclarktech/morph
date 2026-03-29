import type {
	DomainSchema,
	OperationDef,
	QualifiedEntry,
} from "@morphdsl/domain-schema";

import { getInjectableParams } from "@morphdsl/domain-schema";

import { typeRefToTypeScript } from "../mappers";

/**
 * Generate client interface with all operation methods.
 */
export const generateClientInterface = (
	operations: readonly QualifiedEntry<OperationDef>[],
	schema: DomainSchema,
	authEntityName?: string,
): string => {
	const methods = operations.map((entry) =>
		generateMethodSignature(entry, schema),
	);

	// Add login method if password auth is detected
	if (authEntityName) {
		methods.push(
			`\treadonly login: (params: { readonly email: string; readonly password: string }) => Effect.Effect<${authEntityName} & { readonly token: string }, HttpClientError>;`,
		);
	}

	return `/**
 * Typed HTTP client interface.
 */
export interface Client {
${methods.join("\n")}
}`;
};

/**
 * Generate method signature for interface.
 * Injectable params are hidden - they're injected server-side from auth context.
 */
const generateMethodSignature = (
	entry: QualifiedEntry<OperationDef>,
	schema: DomainSchema,
): string => {
	const op = entry.def;
	const outputType = typeRefToTypeScript(op.output);
	const errorTypes = op.errors.map((error) => `${error.name}Error`);

	// Get injectable params for this operation - these are hidden from the client
	const injectableParameters = getInjectableParams(schema, entry.name);
	const injectableNames = new Set(injectableParameters.map((p) => p.paramName));

	// Filter out injectable params - they're injected server-side
	const visibleParameters = Object.entries(op.input).filter(
		([name]) => !injectableNames.has(name),
	);

	// Build parameter signature
	const paramSignature =
		visibleParameters.length === 0
			? ""
			: `params: { ${visibleParameters
					.map(([name, param]) => {
						const type = typeRefToTypeScript(param.type);
						const optional = param.optional ? "?" : "";
						return `readonly ${name}${optional}: ${type}`;
					})
					.join("; ")} }`;

	// Build error union
	const errorUnion =
		errorTypes.length > 0
			? `${errorTypes.join(" | ")} | HttpClientError`
			: "HttpClientError";

	return `\treadonly ${entry.name}: (${paramSignature}) => Effect.Effect<${outputType}, ${errorUnion}>;`;
};
