import type { GeneratedFile } from "@morph/domain-schema";

import type {
	GeneratorPlugin,
	PluginContext,
	PluginMetadataEntry,
	PluginResult,
} from "./interface";

import { schemaHasTag } from "./helpers";

export interface PluginGraphError {
	plugin: string;
	missingDep: string;
	reason: string;
}

const isPluginActive = (
	plugin: GeneratorPlugin,
	context: PluginContext,
): boolean =>
	!plugin.tags ||
	plugin.tags.length === 0 ||
	plugin.tags.some((tag) => schemaHasTag(context.schema, tag));

export const validatePluginGraph = (
	plugins: readonly GeneratorPlugin[],
	context: PluginContext,
): PluginGraphError[] => {
	const activePlugins = plugins.filter((p) => isPluginActive(p, context));
	const pluginIds = new Set(plugins.map((p) => p.id));
	const activeIds = new Set(activePlugins.map((p) => p.id));
	const errors: PluginGraphError[] = [];

	for (const plugin of activePlugins) {
		for (const dep of plugin.dependencies ?? []) {
			if (!pluginIds.has(dep)) {
				errors.push({
					plugin: plugin.id,
					missingDep: dep,
					reason: "dependency not registered",
				});
			} else if (plugin.tags?.length && !activeIds.has(dep)) {
				const depPlugin = plugins.find((p) => p.id === dep);
				const reason = depPlugin?.tags?.length
					? `schema missing ${depPlugin.tags.join(" or ")} tag`
					: "dependency inactive";
				errors.push({ plugin: plugin.id, missingDep: dep, reason });
			}
		}
	}

	return errors;
};

const toposort = (plugins: GeneratorPlugin[]): GeneratorPlugin[] => {
	const byId = new Map(plugins.map((p) => [p.id, p]));
	const visited = new Set<string>();
	const result: GeneratorPlugin[] = [];

	const visit = (id: string): void => {
		if (visited.has(id)) return;
		visited.add(id);
		const plugin = byId.get(id);
		if (!plugin) return;
		for (const dep of plugin.dependencies ?? []) {
			visit(dep);
		}
		result.push(plugin);
	};

	for (const plugin of plugins) {
		visit(plugin.id);
	}

	return result;
};

const shouldRunPlugin = (
	plugin: GeneratorPlugin,
	context: PluginContext,
	completedPlugins: Set<string>,
): boolean => {
	if (plugin.tags && plugin.tags.length > 0) {
		const hasRequiredTag = plugin.tags.some((tag) =>
			schemaHasTag(context.schema, tag),
		);
		if (!hasRequiredTag) return false;
	}

	for (const dep of plugin.dependencies ?? []) {
		if (!completedPlugins.has(dep)) {
			return false;
		}
	}

	return true;
};

const collectPluginMetadata = (
	plugins: readonly GeneratorPlugin[],
	context: PluginContext,
): readonly PluginMetadataEntry[] => {
	const sorted = toposort([...plugins]);
	return sorted.flatMap((p) => {
		if (!isPluginActive(p, context) || !p.metadata) return [];
		return [{ pluginId: p.id, ...p.metadata }];
	});
};

export const runPlugins = (
	plugins: readonly GeneratorPlugin[],
	context: PluginContext,
): GeneratedFile[] => {
	const errors = validatePluginGraph(plugins, context);
	if (errors.length > 0) {
		const message = errors
			.map(
				(error) =>
					`Plugin "${error.plugin}" requires "${error.missingDep}" (${error.reason})`,
			)
			.join("; ");
		throw new Error(`Plugin dependency errors: ${message}`);
	}

	const sorted = toposort([...plugins]);
	const pluginMetadata = collectPluginMetadata(plugins, context);
	const enrichedContext = { ...context, pluginMetadata };
	const completed = new Set<string>();
	const files: GeneratedFile[] = [];

	for (const plugin of sorted) {
		if (shouldRunPlugin(plugin, enrichedContext, completed)) {
			const result = plugin.generate(enrichedContext);
			files.push(...result);
			completed.add(plugin.id);
		}
	}

	return files;
};

export const runPluginsWithResults = (
	plugins: readonly GeneratorPlugin[],
	context: PluginContext,
): PluginResult[] => {
	const errors = validatePluginGraph(plugins, context);
	if (errors.length > 0) {
		const message = errors
			.map(
				(error) =>
					`Plugin "${error.plugin}" requires "${error.missingDep}" (${error.reason})`,
			)
			.join("; ");
		throw new Error(`Plugin dependency errors: ${message}`);
	}

	const sorted = toposort([...plugins]);
	const pluginMetadata = collectPluginMetadata(plugins, context);
	const enrichedContext = { ...context, pluginMetadata };
	const completed = new Set<string>();
	const results: PluginResult[] = [];

	for (const plugin of sorted) {
		if (shouldRunPlugin(plugin, enrichedContext, completed)) {
			const files = plugin.generate(enrichedContext);
			results.push({ pluginId: plugin.id, files });
			completed.add(plugin.id);
		}
	}

	return results;
};
