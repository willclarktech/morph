import type { DomainSchema, GeneratedFile } from "@morph/domain-schema";

import { generatePropertiesReadme } from "./readme";
import { generateValidatorProperties } from "./validators";

export interface PropertiesPipelineConfig {
	readonly name: string;
	readonly packagePath: string;
	readonly generatePackageJson: () => string;
	readonly generateConfigFiles: () => GeneratedFile[];
	/** Optional: DSL package to import from (default: @{name}/dsl) */
	readonly dslPackage?: string;
}

export const generate = (
	schema: DomainSchema,
	config: PropertiesPipelineConfig,
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
		content: generateValidatorProperties(schema, dslPackage),
		filename: `${packagePath}/src/validators.ts`,
	});

	files.push({
		content: `export { validatorProperties } from "./validators";\n`,
		filename: `${packagePath}/src/index.ts`,
	});

	files.push({
		content: generatePropertiesReadme(schema, name),
		filename: `${packagePath}/README.md`,
	});

	return files;
};

export * from "./readme";
export * from "./validators";
