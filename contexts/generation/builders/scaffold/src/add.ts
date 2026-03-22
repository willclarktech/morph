import type { GeneratedFile, GenerationResult } from "./init";

import { interpolate } from "./interpolate";
import { loadTemplates } from "./template-loader";

export interface AddPackageOptions {
	readonly coreName?: string | undefined;
	readonly monorepoRoot: string;
	readonly name: string;
	readonly scope: string;
	readonly type: PackageType;
}

export type PackageType = "api" | "cli" | "lib" | "mcp";

const getPackageDir = (type: PackageType): string => {
	switch (type) {
		case "api":
		case "cli":
		case "mcp": {
			return "apps";
		}
		case "lib": {
			return "libs";
		}
	}
};

const getTemplateType = (type: PackageType): "cli" | "lib" =>
	type === "lib" ? "lib" : "cli";

export const add = async (
	options: AddPackageOptions,
): Promise<GenerationResult> => {
	const { coreName, monorepoRoot, name, scope, type } = options;
	const prefix = monorepoRoot ? `${monorepoRoot}/` : "";
	const packageDir = getPackageDir(type);
	const packagePath = `${prefix}${packageDir}/${name}`;
	const variables = { coreName: coreName ?? "core", name, scope };

	const templateType = getTemplateType(type);
	const templates = await loadTemplates(templateType);

	const files: GeneratedFile[] = [
		...templates.map((template) => ({
			content: template.needsInterpolation
				? interpolate(template.content, variables)
				: template.content,
			filename: `${packagePath}/${template.outputPath}`,
		})),
		{
			content: `export {};\n`,
			filename: `${packagePath}/src/index.ts`,
		},
	];

	return { files };
};
