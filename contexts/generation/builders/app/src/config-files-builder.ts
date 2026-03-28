import type { GeneratedFile } from "@morph/domain-schema";

/** Convert project name to lowercase for package scope */
const toPackageScope = (name: string): string => name.toLowerCase();

/**
 * Generate standard ESLint and TypeScript config files for a package.
 */
export const buildConfigFiles = (
	packagePath: string,
	name: string,
): GeneratedFile[] => {
	const scope = toPackageScope(name);
	return [
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
};

/**
 * Generate config files for CLI app (includes CLI preset).
 */
export const buildCliConfigFiles = (
	packagePath: string,
	name: string,
): GeneratedFile[] => {
	const scope = toPackageScope(name);
	return [
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
};
