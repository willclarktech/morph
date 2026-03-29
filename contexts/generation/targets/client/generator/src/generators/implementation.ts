import type {
	DomainSchema,
	OperationDef,
	QualifiedEntry,
} from "@morphdsl/domain-schema";

import {
	conditionReferencesCurrentUser,
	getDomainServiceAction,
	getInjectableParams,
	getOperationPreInvariantDefs,
	getPrimaryWriteAggregate,
	isDomainService,
} from "@morphdsl/domain-schema";
import { indent } from "@morphdsl/utils";

import type { DomainServiceContext } from "../routes";

import { typeRefToTypeScript } from "../mappers";
import { buildRoute } from "../routes";

/**
 * Generate client factory function.
 */
/**
 * Check if any operation needs JSON body headers.
 */
const operationsNeedJsonHeaders = (
	operations: readonly QualifiedEntry<OperationDef>[],
	schema: DomainSchema,
	basePath: string,
): boolean => {
	for (const entry of operations) {
		const op = entry.def;
		const injectableParameters = getInjectableParams(schema, entry.name);
		const injectableParamNames = injectableParameters.map((p) => p.paramName);
		const injectableNames = new Set(injectableParamNames);

		let domainServiceContext: DomainServiceContext | undefined;
		if (isDomainService(schema, entry.name)) {
			const primaryAggregate = getPrimaryWriteAggregate(schema, entry.name);
			if (primaryAggregate) {
				domainServiceContext = {
					action: getDomainServiceAction(entry.name, primaryAggregate),
					primaryAggregate,
				};
			}
		}

		const route = buildRoute(
			entry.name,
			op,
			basePath,
			injectableParamNames,
			domainServiceContext,
		);
		const pathParameters = route.pathParams;
		const visibleParameters = Object.entries(op.input).filter(
			([name]) => !injectableNames.has(name),
		);
		const nonPathParameters = visibleParameters.filter(
			([name]) => !pathParameters.includes(name),
		);
		const needsBody =
			route.method !== "GET" &&
			route.method !== "DELETE" &&
			nonPathParameters.length > 0;
		if (needsBody) return true;
	}
	return false;
};

export interface ClientFactoryResult {
	readonly code: string;
	readonly needsJsonHeaders: boolean;
}

export const generateClientFactory = (
	operations: readonly QualifiedEntry<OperationDef>[],
	schema: DomainSchema,
	basePath: string,
	hasAuth: boolean,
	authEntityName?: string,
): ClientFactoryResult => {
	const methods = operations.map((entry) =>
		generateMethodImplementation(entry, schema, basePath, hasAuth),
	);

	const needsJsonHeaders =
		authEntityName !== undefined ||
		operationsNeedJsonHeaders(operations, schema, basePath);

	// Add login method if password auth is detected
	if (authEntityName) {
		methods.push(
			indent(
				`login: (params) =>
	request<${authEntityName} & { readonly token: string }>(\`\${baseUrl}/auth/login\`, {
		method: "POST",
		headers: jsonHeaders(undefined, format),
		body: JSON.stringify(params),
	})`,
				2,
			),
		);
	}

	const formatDestructure = needsJsonHeaders ? ", format" : "";

	return {
		code: `/**
 * Create a typed HTTP client.
 */
export const createClient = (config: ClientConfig): Client => {
	const { baseUrl${hasAuth ? ", token" : ""}${formatDestructure} } = config;

	return {
${methods.join(",\n\n")}
	};
};`,
		needsJsonHeaders,
	};
};

/**
 * Generate method implementation.
 */
const generateMethodImplementation = (
	entry: QualifiedEntry<OperationDef>,
	schema: DomainSchema,
	basePath: string,
	hasAuth: boolean,
): string => {
	const op = entry.def;

	// Get injectable params first - they affect route building and param handling
	const injectableParameters = getInjectableParams(schema, entry.name);
	const injectableParamNames = injectableParameters.map((p) => p.paramName);
	const injectableNames = new Set(injectableParamNames);

	// Check if this is a domain service and build routing context
	let domainServiceContext: DomainServiceContext | undefined;
	if (isDomainService(schema, entry.name)) {
		const primaryAggregate = getPrimaryWriteAggregate(schema, entry.name);
		if (primaryAggregate) {
			domainServiceContext = {
				action: getDomainServiceAction(entry.name, primaryAggregate),
				primaryAggregate,
			};
		}
	}

	// Build route excluding injectable params from path
	const route = buildRoute(
		entry.name,
		op,
		basePath,
		injectableParamNames,
		domainServiceContext,
	);
	const pathParameters = route.pathParams;

	// Filter out injectable params from all parameter handling
	const visibleParameters = Object.entries(op.input).filter(
		([name]) => !injectableNames.has(name),
	);

	// Check if this operation requires auth
	const preInvariants = getOperationPreInvariantDefs(schema, entry.name);
	const requiresAuth = preInvariants.some((inv) =>
		conditionReferencesCurrentUser(inv.condition),
	);

	// Build parameter signature
	const paramSignature = visibleParameters.length === 0 ? "" : "params";

	// Build URL construction
	let urlExpr: string;
	if (pathParameters.length > 0) {
		const pathReplacements = pathParameters
			.map((p) => `.replace(":${p}", params.${p})`)
			.join("");
		urlExpr = `\`\${baseUrl}${route.path}\`${pathReplacements}`;
	} else {
		urlExpr = `\`\${baseUrl}${route.path}\``;
	}

	// Build query string for GET/DELETE with non-path params
	const nonPathParameters = visibleParameters.filter(
		([name]) => !pathParameters.includes(name),
	);
	const needsQueryString =
		(route.method === "GET" || route.method === "DELETE") &&
		nonPathParameters.length > 0;

	if (needsQueryString) {
		const querySetLines = nonPathParameters.map(([name, paramDef]) => {
			const isOptional = paramDef.optional === true;
			const isString =
				paramDef.type.kind === "primitive" && paramDef.type.name === "string";
			const valueExpr = isString ? `params.${name}` : `String(params.${name})`;
			return isOptional
				? `if (params.${name} !== undefined) url.searchParams.set("${name}", ${valueExpr});`
				: `url.searchParams.set("${name}", ${valueExpr});`;
		});
		urlExpr = `(() => {
			const url = new URL(${urlExpr});
			${querySetLines.join("\n\t\t\t")}
			return url.toString();
		})()`;
	}

	// Build request body for POST/PATCH/PUT
	const needsBody =
		route.method !== "GET" &&
		route.method !== "DELETE" &&
		nonPathParameters.length > 0;

	// Build headers expression using helpers from @morphdsl/http-client
	let headersExpr: string | undefined;
	if (needsBody && requiresAuth && hasAuth) {
		headersExpr = "jsonHeaders(token, format)";
	} else if (needsBody) {
		headersExpr = "jsonHeaders(undefined, format)";
	} else if (requiresAuth && hasAuth) {
		headersExpr = "authHeaders(token)";
	}

	// Build request init properties
	const initProperties: string[] = [`method: "${route.method}"`];
	if (headersExpr) initProperties.push(`headers: ${headersExpr}`);
	if (needsBody) {
		const bodyParameters = nonPathParameters.map(([name]) => name);
		const allParamsAreBody = bodyParameters.length === visibleParameters.length;
		const bodyString = allParamsAreBody
			? "params"
			: `{ ${bodyParameters.map((p) => `${p}: params.${p}`).join(", ")} }`;
		initProperties.push(`body: JSON.stringify(${bodyString})`);
	}

	const outputType = typeRefToTypeScript(op.output);

	return indent(
		`${entry.name}: (${paramSignature}) =>
	request<${outputType}>(${urlExpr}, {
		${initProperties.join(",\n\t\t")},
	})`,
		2,
	);
};
