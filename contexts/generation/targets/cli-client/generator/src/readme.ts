import type {
	DomainSchema,
	OperationDef,
	QualifiedEntry,
} from "@morphdsl/domain-schema";

import {
	codeBlock,
	description,
	heading,
	joinSections,
} from "@morphdsl/builder-readme";
import {
	getAllOperations,
	getInjectableParams,
	schemaHasAuthRequirement,
} from "@morphdsl/domain-schema";
import { toEnvironmentPrefix, toKebabCase } from "@morphdsl/utils";

const generateOperationExample = (
	op: QualifiedEntry<OperationDef>,
	injectableNames: ReadonlySet<string>,
): string => {
	const kebab = toKebabCase(op.name);
	const params = Object.entries(op.def.input)
		.filter(
			([name, p]) => !p.sensitive && !p.optional && !injectableNames.has(name),
		)
		.map(([name]) => `<${toKebabCase(name)}>`)
		.join(" ");

	return `${kebab} ${params}`;
};

export const generateClientCliReadme = (
	schema: DomainSchema,
	cliName: string,
	cliDescription?: string,
): string => {
	const hasAuth = schemaHasAuthRequirement(schema);
	const envPrefix = toEnvironmentPrefix(cliName);

	const apiOperations = getAllOperations(schema).filter((op) =>
		op.def.tags.includes("@cli-client"),
	);

	const configSection = [
		heading(2, "Configuration"),
		"Set the API URL before using the CLI:",
		codeBlock(`${cliName} config --api-url http://localhost:3000`, "bash"),
		...(hasAuth
			? [
					"",
					"Authenticate to get a token:",
					codeBlock(`${cliName} login --email user@example.com`, "bash"),
				]
			: []),
	].join("\n\n");

	const envSection = [
		heading(2, "Environment Variables"),
		`- \`${envPrefix}_API_URL\` - Override API URL`,
		`- \`${envPrefix}_API_TOKEN\` - Override auth token`,
	].join("\n\n");

	const commandsSection = [
		heading(2, "Commands"),
		...apiOperations.map((op) => {
			const injectableNames = new Set(
				getInjectableParams(schema, op.name).map((p) => p.paramName),
			);
			const example = generateOperationExample(op, injectableNames);
			const desc = op.def.description;
			return `### ${toKebabCase(op.name)}\n\n${desc}\n\n\`\`\`bash\n${cliName} ${example}\n\`\`\``;
		}),
	].join("\n\n");

	return joinSections([
		heading(1, cliName),
		cliDescription ?? description(schema),
		configSection,
		envSection,
		commandsSection,
	]);
};
