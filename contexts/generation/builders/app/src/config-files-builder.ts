import type { GeneratedFile } from "@morphdsl/domain-schema";

import { toPackageScope } from "./package-json-builder";

interface ConfigFilesOptions {
	packagePath: string;
	name: string;
	npmScope?: string;
	isPrivate?: boolean;
}

/**
 * Generate standard ESLint and TypeScript config files for a package.
 */
export const buildConfigFiles = (
	options: ConfigFilesOptions,
): GeneratedFile[] => {
	const { packagePath, name, npmScope, isPrivate = true } = options;
	const scope = toPackageScope(name, npmScope);
	const files: GeneratedFile[] = [
		{
			content: `import { configs } from "@${scope}/eslint-config";

export default [{ ignores: ["**/*.template.ts"] }, ...configs.generated];
`,
			filename: `${packagePath}/eslint.config.ts`,
		},
		{
			content: `{
	"extends": "@${scope}/tsconfig/base.json",
	"compilerOptions": {
		"rootDir": ".",
		"outDir": "dist"
	},
	"include": ["src"]
}
`,
			filename: `${packagePath}/tsconfig.json`,
		},
	];
	if (!isPrivate) {
		files.push({
			content: `{
	"extends": "@${scope}/tsconfig/build.json",
	"include": ["src"]
}
`,
			filename: `${packagePath}/tsconfig.build.json`,
		});
	}
	return files;
};

/**
 * Generate config files for CLI app (includes CLI preset).
 */
export const buildCliConfigFiles = (
	options: ConfigFilesOptions,
): GeneratedFile[] => {
	const { packagePath, name, npmScope, isPrivate = true } = options;
	const scope = toPackageScope(name, npmScope);
	const files: GeneratedFile[] = [
		{
			content: `import { configs } from "@${scope}/eslint-config";

export default [{ ignores: ["**/*.template.ts"] }, ...configs.generated, ...configs.cli];
`,
			filename: `${packagePath}/eslint.config.ts`,
		},
		{
			content: `{
	"extends": "@${scope}/tsconfig/base.json",
	"compilerOptions": {
		"rootDir": ".",
		"outDir": "dist"
	},
	"include": ["src"]
}
`,
			filename: `${packagePath}/tsconfig.json`,
		},
	];
	if (!isPrivate) {
		files.push({
			content: `{
	"extends": "@${scope}/tsconfig/build.json",
	"include": ["src"]
}
`,
			filename: `${packagePath}/tsconfig.build.json`,
		});
	}
	return files;
};
