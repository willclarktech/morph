import type { DomainSchema, GeneratedFile } from "@morphdsl/domain-schema";
import type {
	GeneratorPlugin,
	PluginContext,
	PluginMetadataEntry,
	QuickStartStep,
} from "@morphdsl/plugin";

import { getAllInvariants } from "@morphdsl/domain-schema";
import { buildDockerignore } from "@morphdsl/builder-app";
import { generate as generateDiagrams } from "@morphdsl/generator-diagrams";
import { generateLicense } from "@morphdsl/generator-license";
import { schemaHasTag } from "@morphdsl/plugin";
import { buildRootReadme, description } from "@morphdsl/builder-readme";

const replaceNamePlaceholder = (command: string, name: string): string =>
	command.replaceAll("{name}", name);

const buildQuickStartSteps = (
	metadata: readonly PluginMetadataEntry[],
	name: string,
): QuickStartStep[] => {
	const steps: QuickStartStep[] = [
		{ description: "Install dependencies:", command: "bun install" },
	];

	for (const entry of metadata) {
		if (entry.quickStartSteps) {
			for (const step of entry.quickStartSteps) {
				steps.push({
					...step,
					command: replaceNamePlaceholder(step.command, name),
				});
			}
		}
	}

	return steps;
};

const buildProjectStructure = (
	metadata: readonly PluginMetadataEntry[],
	hasPropertyTests: boolean,
): string[] => {
	const lines: string[] = [
		".",
		"├── config/",
		"│   ├── eslint/           # Shared ESLint config",
		"│   └── tsconfig/         # Shared TypeScript config",
	];

	// Collect libs and apps from metadata
	const libs: { path: string; description: string }[] = [];
	const apps: { path: string; description: string }[] = [];

	for (const entry of metadata) {
		if (entry.projectStructure) {
			const { path, description } = entry.projectStructure;
			if (path.startsWith("libs/")) {
				libs.push({ path, description });
			} else if (path.startsWith("apps/")) {
				apps.push({ path, description });
			}
		}
	}

	// Add libs section
	if (libs.length > 0) {
		lines.push("├── libs/");
		for (let i = 0; i < libs.length; i++) {
			const lib = libs[i]!;
			const prefix = i === libs.length - 1 && apps.length === 0 ? "└" : "├";
			const dirName = lib.path.replace("libs/", "").replace("/", "");
			lines.push(`│   ${prefix}── ${dirName.padEnd(16)}# ${lib.description}`);
		}
	}

	// Add apps section
	if (apps.length > 0) {
		lines.push("├── apps/");
		for (let i = 0; i < apps.length; i++) {
			const app = apps[i]!;
			const prefix = i === apps.length - 1 ? "└" : "├";
			const dirName = app.path.replace("apps/", "").replace("/", "");
			lines.push(`│   ${prefix}── ${dirName.padEnd(16)}# ${app.description}`);
		}
	}

	// Tests section
	lines.push(
		"├── tests/",
		"│   └── scenarios/        # Behavior scenarios (Given/When/Then)",
	);
	if (hasPropertyTests) {
		lines.push("│   └── properties/       # Property-based test suites");
	}

	// Root files
	lines.push(
		"├── schema.json           # Domain schema + extensions",
		"└── package.json          # Monorepo root",
	);

	return lines;
};

const generateRootReadme = (
	schema: DomainSchema,
	name: string,
	metadata: readonly PluginMetadataEntry[],
	hasPropertyTests: boolean,
): string => {
	const envPrefix = name.toUpperCase().replaceAll("-", "_");

	return buildRootReadme({
		title: schema.name,
		description: description(schema),
		quickStartSteps: buildQuickStartSteps(metadata, name),
		scripts: [
			{
				command: "bun run build:check",
				description: "Type-check all packages",
			},
			{ command: "bun run lint", description: "Lint all packages" },
			{ command: "bun run lint:fix", description: "Fix lint issues" },
			{ command: "bun run format", description: "Check formatting" },
			{ command: "bun run format:fix", description: "Fix formatting" },
			{ command: "bun run test", description: "Run all tests" },
		],
		projectStructure: buildProjectStructure(metadata, hasPropertyTests),
		configIntro: `### Storage Backends\n\nThe \`extensions.storage\` field in \`schema.json\` defines available storage backends. Set the \`${envPrefix}_STORAGE\` environment variable to select one at runtime:`,
		configVariables: [
			{
				name: `${envPrefix}_STORAGE`,
				values: [
					"memory    # In-memory (default, data lost on restart)",
					"jsonfile  # JSON file persistence",
					"sqlite    # SQLite database",
					"redis     # Redis",
				],
			},
		],
	});
};

const hasAnyApp = (schema: DomainSchema): boolean =>
	schemaHasTag(schema, "@api") ||
	schemaHasTag(schema, "@cli") ||
	schemaHasTag(schema, "@mcp") ||
	schemaHasTag(schema, "@ui");

export const monorepoRootPlugin: GeneratorPlugin = {
	id: "monorepo-root",
	kind: "doc",
	dependencies: [],

	generate(ctx: PluginContext): GeneratedFile[] {
		const { schema, name, pluginMetadata = [] } = ctx;
		const files: GeneratedFile[] = [];

		const invariants = getAllInvariants(schema);
		const hasPropertyTests = invariants.some(
			(entry) =>
				entry.def.scope.kind === "entity" || entry.def.scope.kind === "context",
		);

		// Diagrams (docs/*)
		const diagramsResult = generateDiagrams(schema);
		files.push(
			...diagramsResult.files.map((f) => ({
				...f,
				filename: `docs/${f.filename}`,
			})),
		);

		// Root README
		files.push({
			content: generateRootReadme(schema, name, pluginMetadata, hasPropertyTests),
			filename: "README.md",
		});

		// LICENSE file (if license is specified in schema metadata)
		if (schema.license) {
			const licenseContent = generateLicense(schema.license);
			if (licenseContent) {
				files.push({ content: licenseContent, filename: "LICENSE" });
			}
		}

		// Dockerignore (only if apps exist)
		if (hasAnyApp(schema)) {
			files.push({
				content: buildDockerignore(),
				filename: ".dockerignore",
			});
		}

		// Procfile (only if apps exist)
		if (hasAnyApp(schema)) {
			const scope = name.toLowerCase();
			const processes: string[] = [];
			if (schemaHasTag(schema, "@api"))
				processes.push(`web: bun run --filter @${scope}/api start`);
			if (schemaHasTag(schema, "@ui"))
				processes.push(`ui: bun run --filter @${scope}/ui start`);
			if (schemaHasTag(schema, "@mcp"))
				processes.push(`mcp: bun run --filter @${scope}/mcp start`);

			if (processes.length > 0) {
				files.push({
					content: processes.join("\n") + "\n",
					filename: "Procfile",
				});
			}
		}

		return files;
	},
};
