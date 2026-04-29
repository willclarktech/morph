import type { GeneratedFile, GenerationResult } from "@morphdsl/domain-schema";

import { interpolate } from "./interpolate";
import { loadTemplates } from "./template-loader";

export interface InitOptions {
	readonly name: string;
	readonly outputDir?: string;
}

export const init = (options: InitOptions): GenerationResult => {
	const { name, outputDir = "" } = options;
	const prefix = outputDir ? `${outputDir}/` : "";
	// scope === name, but we keep both variables for template compatibility
	const variables = { name, scope: name };

	const templates = loadTemplates("monorepo");

	const files: GeneratedFile[] = templates.map((template) => ({
		content: template.needsInterpolation
			? interpolate(template.content, variables)
			: template.content,
		filename: `${prefix}${template.outputPath}`,
	}));

	return { files };
};

export {
	type GeneratedFile,
	type GenerationResult,
} from "@morphdsl/domain-schema";
