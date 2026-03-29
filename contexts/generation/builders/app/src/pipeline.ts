import type { GeneratedFile } from "@morphdsl/domain-schema";

export interface AppPipelineConfig {
	appType: string;
	packagePath: string;
	name: string;
	generatePackageJson: () => string;
	generateConfigFiles: () => readonly GeneratedFile[];
	generateAppEntry: () => { files: readonly GeneratedFile[] };
	generateEnvExample: () => string;
	generateDockerfile: () => string;
}

export const generateAppFiles = (config: AppPipelineConfig): GeneratedFile[] => {
	const { packagePath } = config;
	return [
		{ filename: `${packagePath}/package.json`, content: config.generatePackageJson() },
		...config.generateConfigFiles(),
		...config.generateAppEntry().files,
		{ filename: `${packagePath}/.env.example`, content: config.generateEnvExample() },
		{ filename: `${packagePath}/Dockerfile`, content: config.generateDockerfile() },
	];
};
