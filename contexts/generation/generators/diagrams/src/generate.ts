import type { DomainSchema, GeneratedFile } from "@morph/domain-schema";

import { generateEntityDiagram } from "./entity-diagram";
import { generateOperationsDiagram } from "./operations-diagram";
import { generateTypesDiagram } from "./types-diagram";

export interface GenerateOptions {
	readonly groupByContext?: boolean;
	readonly showAttributes?: boolean;
}

export interface GenerateResult {
	readonly files: GeneratedFile[];
}

export const generate = (
	schema: DomainSchema,
	options: GenerateOptions = {},
): GenerateResult => {
	const entityDiagram = generateEntityDiagram(schema, options);
	const operationsDiagram = generateOperationsDiagram(schema);
	const typesDiagram = generateTypesDiagram(schema);

	// If nothing to generate, return empty
	if (!entityDiagram && !operationsDiagram && !typesDiagram) {
		return { files: [] };
	}

	const sections: string[] = [];

	sections.push("# Domain Model");
	sections.push("");
	sections.push("> Visual documentation generated from schema.");

	if (entityDiagram) {
		sections.push("");
		sections.push("## Entities");
		sections.push("");
		sections.push("```mermaid");
		sections.push(entityDiagram);
		sections.push("```");
	}

	if (operationsDiagram) {
		sections.push("");
		sections.push("## Operations");
		sections.push("");
		sections.push("**Legend:** ✏️ = command (writes), 🔍 = query (reads only)");
		sections.push("");
		sections.push("```mermaid");
		sections.push(operationsDiagram);
		sections.push("```");
	}

	if (typesDiagram) {
		sections.push("");
		sections.push("## Types & Functions");
		sections.push("");
		sections.push("```mermaid");
		sections.push(typesDiagram);
		sections.push("```");
	}

	sections.push("");

	return {
		files: [{ content: sections.join("\n"), filename: "domain-model.md" }],
	};
};
