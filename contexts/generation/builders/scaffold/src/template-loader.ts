import path from "node:path";

interface TemplateDefinition {
	readonly dir: string;
	readonly files: readonly string[];
}

interface TemplateFile {
	readonly content: string;
	readonly needsInterpolation: boolean;
	readonly outputPath: string;
}

type TemplateType = "cli" | "lib" | "monorepo";

const TEMPLATE_DEFINITIONS: Record<TemplateType, TemplateDefinition> = {
	cli: {
		dir: "cli",
		files: ["eslint.config.ts.tmpl", "package.json.tmpl", "tsconfig.json.tmpl"],
	},
	lib: {
		dir: "lib",
		files: ["eslint.config.ts.tmpl", "package.json.tmpl", "tsconfig.json.tmpl"],
	},
	monorepo: {
		dir: "monorepo",
		// Files prefixed with `_` are renamed to `.` on output. npm strips
		// dotfiles based on `.gitignore` defaults, so source-side dot files
		// would be missing from the published tarball.
		files: [
			"_editorconfig",
			"_github/workflows/ci.yml",
			"_gitignore",
			"bunfig.toml",
			"package.json.tmpl",
			"README.md.tmpl",
			"turbo.json",
			"config/eslint/package.json.tmpl",
			"config/eslint/README.md.tmpl",
			"config/eslint/src/index.ts",
			"config/eslint/tsconfig.json",
			"config/tsconfig/base.json",
			"config/tsconfig/package.json.tmpl",
			"config/tsconfig/README.md.tmpl",
		],
	},
};

// At dev time (src/) and at runtime (dist/), templates live one directory up.
const TEMPLATES_DIR = path.join(import.meta.dir, "../template");

// Convert source-side path conventions to output paths:
// - strip trailing `.tmpl` (interpolated templates)
// - replace leading `_` on each segment with `.` (dotfile workaround)
const toOutputPath = (relativePath: string): string => {
	const withoutTmpl = relativePath.endsWith(".tmpl")
		? relativePath.slice(0, -5)
		: relativePath;
	return withoutTmpl
		.split("/")
		.map((segment) =>
			segment.startsWith("_") ? `.${segment.slice(1)}` : segment,
		)
		.join("/");
};

const loadTemplateFile = async (
	templateDir: string,
	relativePath: string,
): Promise<TemplateFile> => {
	const fullPath = path.join(templateDir, relativePath);
	const content = await Bun.file(fullPath).text();
	const needsInterpolation = relativePath.endsWith(".tmpl");
	const outputPath = toOutputPath(relativePath);

	return { content, needsInterpolation, outputPath };
};

export const loadTemplates = async (
	type: TemplateType,
): Promise<readonly TemplateFile[]> => {
	const definition = TEMPLATE_DEFINITIONS[type];
	const typeDir = path.join(TEMPLATES_DIR, definition.dir);

	return Promise.all(
		definition.files.map((file) => loadTemplateFile(typeDir, file)),
	);
};
