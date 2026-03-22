import { sep } from "@morph/utils";

/**
 * Context package information for multi-context apps.
 */
export interface ContextPackages {
	readonly contextName: string;
	readonly corePackage: string;
	readonly dslPackage: string;
}

const toPascalCase = (name: string): string =>
	name
		.split(/[-_]/)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");

export interface ContextImportOptions {
	readonly contexts: readonly ContextPackages[];
	readonly hasAuth: boolean;
	readonly hasEntities: boolean;
	readonly hasEvents: boolean;
	readonly hasSubscribers: boolean;
}

export const generateContextImports = (
	options: ContextImportOptions,
): string => {
	const { contexts, hasAuth, hasEntities, hasEvents, hasSubscribers } = options;
	const isMultiContext = contexts.length > 1;

	return contexts
		.map((ctx) => {
			const pascal = toPascalCase(ctx.contextName);
			const isFirst = ctx === contexts[0];
			const baseImports = ["HandlersLayer", "ops"];

			// Storage: import from every context (each context has its own repositories)
			// Events/subscribers/auth: import shared infrastructure from first context only
			const infraImports = [
				...(hasEntities ? ["resolveStorage"] : []),
				...(isFirst && hasEvents ? ["resolveEventStore"] : []),
				...(isFirst && hasSubscribers
					? [
							"EventEmitterInMemory",
							"EventSubscriberRegistry",
							"SubscribersLive",
							"SubscriberBootstrap",
						]
					: []),
				...(isFirst && hasAuth ? ["AuthService", "UserRepository"] : []),
			];

			const allImports = [...infraImports, ...baseImports];

			if (isMultiContext) {
				// Alias HandlersLayer, ops, and resolveStorage for multi-context
				const aliasedImports = allImports.map((imp) => {
					if (imp === "HandlersLayer")
						return `HandlersLayer as ${pascal}HandlersLayer`;
					if (imp === "ops") return `ops as ${pascal}Ops`;
					if (imp === "resolveStorage")
						return `resolveStorage as resolve${pascal}Storage`;
					return imp;
				});
				return `import {\n\t${aliasedImports.join(sep(1, ","))},\n} from "${ctx.corePackage}";`;
			}
			return `import {\n\t${allImports.join(sep(1, ","))},\n} from "${ctx.corePackage}";`;
		})
		.join("\n");
};

export const generateOpsMergeCode = (
	contexts: readonly ContextPackages[],
): string => {
	if (contexts.length <= 1) return "";

	return `
// Merge operations from all contexts with prefixes
const ops = {
${contexts.map((ctx) => `\t...Object.fromEntries(Object.entries(${toPascalCase(ctx.contextName)}Ops).map(([k, v]) => [\`${ctx.contextName}:\${k}\`, v])),`).join("\n")}
};
`;
};

export const generateHandlersLayerMergeCode = (
	contexts: readonly ContextPackages[],
): string => {
	if (contexts.length <= 1) return "";

	return `const HandlersLayer = Layer.mergeAll(${contexts.map((ctx) => `${toPascalCase(ctx.contextName)}HandlersLayer`).join(", ")});`;
};
