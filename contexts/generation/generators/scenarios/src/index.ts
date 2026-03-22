import type { DomainSchema, GeneratedFile } from "@morph/domain-schema";

import { generateScenariosReadme } from "./readme";
import { generateScenariosScaffold } from "./scaffold";

export interface ScenariosPipelineConfig {
	readonly name: string;
	readonly packagePath: string;
	readonly generatePackageJson: () => string;
	readonly generateConfigFiles: () => GeneratedFile[];
	/** Optional: DSL package to import from (default: @{name}/dsl) */
	readonly dslPackage?: string;
}

export const generate = (
	schema: DomainSchema,
	config: ScenariosPipelineConfig,
): GeneratedFile[] => {
	const { name, packagePath, generatePackageJson, generateConfigFiles } =
		config;
	const dslPackage = config.dslPackage ?? `@${name.toLowerCase()}/dsl`;
	const files: GeneratedFile[] = [];

	files.push({
		content: generatePackageJson(),
		filename: `${packagePath}/package.json`,
	});

	files.push(...generateConfigFiles());

	files.push({
		content: generateScenariosScaffold(dslPackage),
		filename: `${packagePath}/src/scenarios.ts`,
	});

	files.push({
		content: `export { scenarios } from "./scenarios";\n`,
		filename: `${packagePath}/src/index.ts`,
	});

	files.push({
		content: generateScenariosReadme(schema, name, dslPackage),
		filename: `${packagePath}/README.md`,
	});

	return files;
};

export * from "./readme";
export * from "./scaffold";
