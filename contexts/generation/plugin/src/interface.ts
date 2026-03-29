import type { SchemaFeatures } from "@morphdsl/builder-app";
import type {
	DomainSchema,
	GeneratedFile,
	TextConfig,
} from "@morphdsl/domain-schema";

export type PluginKind = "lib" | "app" | "test-support" | "doc" | "infra";

export interface QuickStartStep {
	readonly description: string;
	readonly command: string;
	readonly language?: string;
}

export interface ProjectStructureEntry {
	readonly path: string;
	readonly description: string;
}

export interface PluginMetadata {
	readonly quickStartSteps?: readonly QuickStartStep[];
	readonly projectStructure?: ProjectStructureEntry;
}

export interface PluginMetadataEntry extends PluginMetadata {
	readonly pluginId: string;
}

export interface GenerateConfig {
	readonly textConfig?: TextConfig | undefined;
	readonly uiConfig?: unknown;
}

export interface PluginContext {
	schema: DomainSchema;
	name: string;
	features: SchemaFeatures;
	config?: GenerateConfig;
	pluginMetadata?: readonly PluginMetadataEntry[];
}

export interface GeneratorPlugin {
	id: string;
	kind: PluginKind;
	tags?: readonly string[];
	dependencies?: readonly string[];
	metadata?: PluginMetadata;

	generate(context: PluginContext): GeneratedFile[];
}

export interface PluginResult {
	pluginId: string;
	files: GeneratedFile[];
}
