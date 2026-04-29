// Template content is inlined at build time via bun's text-import attribute.
// This makes templates available in browser bundles (no Bun.file/disk read at
// runtime), so the playground can run the full new-project flow.

// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- ambient module declarations for `with { type: "text" }` imports must be visible to consumers that walk into scaffold's source
/// <reference path="./template-types.d.ts" />

import cliEslintConfig from "../template/cli/eslint.config.ts.tmpl" with { type: "text" };
import cliPackageJson from "../template/cli/package.json.tmpl" with { type: "text" };
import cliTsconfig from "../template/cli/tsconfig.json.tmpl" with { type: "text" };
import libraryEslintConfig from "../template/lib/eslint.config.ts.tmpl" with { type: "text" };
import libraryPackageJson from "../template/lib/package.json.tmpl" with { type: "text" };
import libraryTsconfig from "../template/lib/tsconfig.json.tmpl" with { type: "text" };
import monorepoEditorconfig from "../template/monorepo/_editorconfig" with { type: "text" };
import monorepoCi from "../template/monorepo/_github/workflows/ci.yml.tmpl" with { type: "text" };
import monorepoGitignore from "../template/monorepo/_gitignore" with { type: "text" };
import monorepoBunfig from "../template/monorepo/bunfig.toml.tmpl" with { type: "text" };
import monorepoEslintPackage from "../template/monorepo/config/eslint/package.json.tmpl" with { type: "text" };
import monorepoEslintReadme from "../template/monorepo/config/eslint/README.md.tmpl" with { type: "text" };
import monorepoEslintIndex from "../template/monorepo/config/eslint/src/index.ts.tmpl" with { type: "text" };
import monorepoEslintTsconfig from "../template/monorepo/config/eslint/tsconfig.json.tmpl" with { type: "text" };
import monorepoTsconfigBase from "../template/monorepo/config/tsconfig/base.json.tmpl" with { type: "text" };
import monorepoTsconfigPackage from "../template/monorepo/config/tsconfig/package.json.tmpl" with { type: "text" };
import monorepoTsconfigReadme from "../template/monorepo/config/tsconfig/README.md.tmpl" with { type: "text" };
import monorepoPackageJson from "../template/monorepo/package.json.tmpl" with { type: "text" };
import monorepoReadme from "../template/monorepo/README.md.tmpl" with { type: "text" };
import monorepoTurbo from "../template/monorepo/turbo.json.tmpl" with { type: "text" };

interface TemplateFile {
	readonly content: string;
	readonly needsInterpolation: boolean;
	readonly outputPath: string;
}

type TemplateType = "cli" | "lib" | "monorepo";

interface TemplateEntry {
	readonly path: string;
	readonly content: string;
}

const TEMPLATE_ENTRIES: Record<TemplateType, readonly TemplateEntry[]> = {
	cli: [
		{ path: "eslint.config.ts.tmpl", content: cliEslintConfig },
		{ path: "package.json.tmpl", content: cliPackageJson },
		{ path: "tsconfig.json.tmpl", content: cliTsconfig },
	],
	lib: [
		{ path: "eslint.config.ts.tmpl", content: libraryEslintConfig },
		{ path: "package.json.tmpl", content: libraryPackageJson },
		{ path: "tsconfig.json.tmpl", content: libraryTsconfig },
	],
	monorepo: [
		// Files prefixed with `_` are renamed to `.` on output. npm strips
		// dotfiles based on `.gitignore` defaults, so source-side dot files
		// would be missing from the published tarball.
		{ path: "_editorconfig", content: monorepoEditorconfig },
		{ path: "_github/workflows/ci.yml.tmpl", content: monorepoCi },
		{ path: "_gitignore", content: monorepoGitignore },
		{ path: "bunfig.toml.tmpl", content: monorepoBunfig },
		{ path: "package.json.tmpl", content: monorepoPackageJson },
		{ path: "README.md.tmpl", content: monorepoReadme },
		{ path: "turbo.json.tmpl", content: monorepoTurbo },
		{ path: "config/eslint/package.json.tmpl", content: monorepoEslintPackage },
		{ path: "config/eslint/README.md.tmpl", content: monorepoEslintReadme },
		{ path: "config/eslint/src/index.ts.tmpl", content: monorepoEslintIndex },
		{
			path: "config/eslint/tsconfig.json.tmpl",
			content: monorepoEslintTsconfig,
		},
		{ path: "config/tsconfig/base.json.tmpl", content: monorepoTsconfigBase },
		{
			path: "config/tsconfig/package.json.tmpl",
			content: monorepoTsconfigPackage,
		},
		{ path: "config/tsconfig/README.md.tmpl", content: monorepoTsconfigReadme },
	],
};

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

const toTemplateFile = (entry: TemplateEntry): TemplateFile => ({
	content: entry.content,
	needsInterpolation: entry.path.endsWith(".tmpl"),
	outputPath: toOutputPath(entry.path),
});

export const loadTemplates = (type: TemplateType): readonly TemplateFile[] =>
	TEMPLATE_ENTRIES[type].map(toTemplateFile);
