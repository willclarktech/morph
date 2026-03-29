import type { QuickStartStep } from "@morphdsl/plugin";

import { codeBlock, heading, joinSections } from "./markdown";

export interface ScriptEntry {
	readonly command: string;
	readonly description: string;
}

export interface ConfigVariable {
	readonly name: string;
	readonly values: string[];
	readonly comment?: string;
}

export interface RootReadmeConfig {
	readonly title: string;
	readonly description?: string;
	readonly quickStartSteps: QuickStartStep[];
	readonly scripts: ScriptEntry[];
	readonly projectStructure: string[];
	readonly configVariables?: ConfigVariable[];
	readonly configIntro?: string;
}

export const buildRootReadme = (config: RootReadmeConfig): string => {
	const sections: string[] = [heading(1, config.title)];

	if (config.description) {
		sections.push(config.description);
	}

	// Quick Start section
	const quickStartParts: string[] = [];
	for (const step of config.quickStartSteps) {
		quickStartParts.push(step.description);
		quickStartParts.push(codeBlock(step.command, step.language ?? "bash"));
	}
	sections.push(heading(2, "Quick Start"), quickStartParts.join("\n\n"));

	// Scripts section
	const scriptLines = config.scripts
		.map((s) => `${s.command}  # ${s.description}`)
		.join("\n");
	sections.push(
		heading(2, "Scripts"),
		"Run from the monorepo root:",
		codeBlock(scriptLines, "bash"),
	);

	// Project Structure section
	sections.push(
		heading(2, "Project Structure"),
		codeBlock(config.projectStructure.join("\n"), ""),
	);

	// Configuration section
	if (config.configVariables && config.configVariables.length > 0) {
		const configParts: string[] = [heading(2, "Configuration")];

		if (config.configIntro) {
			configParts.push(config.configIntro);
		}

		for (const variable of config.configVariables) {
			const variableLines = variable.values.map((v) => `${variable.name}=${v}`);
			if (variable.comment) {
				configParts.push(variable.comment);
			}
			configParts.push(codeBlock(variableLines.join("\n"), "bash"));
		}

		sections.push(...configParts);
	}

	return joinSections(sections);
};
