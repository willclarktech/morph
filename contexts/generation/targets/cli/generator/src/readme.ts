/**
 * README generation for CLI package.
 */
import type {
	DomainSchema,
	OperationDef,
	QualifiedEntry,
} from "@morphdsl/domain-schema";

import {
	code,
	codeBlock,
	description,
	entities,
	errors,
	events,
	heading,
	joinSections,
	operations,
	table,
	valueObjects,
} from "@morphdsl/builder-readme";
import {
	getAllEntities,
	getAllFunctions,
	getAllOperations,
	getAllValueObjects,
	getCommandsWithEvents,
	schemaHasAuthRequirement,
} from "@morphdsl/domain-schema";
import { toKebabCase } from "@morphdsl/utils";

/**
 * Generate a CLI command example.
 */
const generateCliExample = (
	op: QualifiedEntry<OperationDef>,
	cliName: string,
	injectableParameters: readonly string[] = [],
): string => {
	const command = toKebabCase(op.name);
	const args = Object.entries(op.def.input)
		.filter(
			([name, p]) =>
				!p.optional && !p.sensitive && !injectableParameters.includes(name),
		)
		.map(([name]) => `<${toKebabCase(name)}>`)
		.join(" ");
	return `${cliName} ${command} ${args}`.trim();
};

/**
 * Generate environment variables section for CLI README.
 */
const generateEnvironmentVariablesSection = (
	schema: DomainSchema,
	envPrefix: string,
): string => {
	const hasEvents = getCommandsWithEvents(schema).length > 0;
	const hasAuth = schemaHasAuthRequirement(schema);

	const variables: [string, string][] = [
		[
			`${envPrefix}_STORAGE`,
			"Storage backend: memory, jsonfile, sqlite, redis",
		],
		[
			`${envPrefix}_DATA_FILE`,
			"Path for jsonfile storage (default: .test-data.json)",
		],
	];

	if (hasEvents) {
		variables.push([
			`${envPrefix}_EVENT_STORE`,
			"Event store backend: memory, jsonfile, redis",
		]);
	}

	if (hasAuth) {
		variables.push([`${envPrefix}_EMAIL`, "Email for authentication"]);
		variables.push([`${envPrefix}_PASSWORD`, "Password for authentication"]);
	}

	const rows = variables.map(([name, desc]) => [code(name), desc]);
	return joinSections([
		heading(2, "Environment Variables"),
		table(["Variable", "Description"], rows),
	]);
};

/**
 * Generate README for CLI package.
 */
export const generateCliReadme = (
	schema: DomainSchema,
	cliName: string,
	cliDescription?: string,
	injectableByOperation?: ReadonlyMap<string, readonly string[]>,
): string => {
	const cliOps = getAllOperations(schema).filter((op) =>
		op.def.tags.includes("@cli"),
	);

	const cliFuncs = getAllFunctions(schema)
		.filter((function_) => function_.def.tags.includes("@cli"))
		.map((function_) => ({
			...function_,
			def: function_.def as unknown as OperationDef,
		}));

	const allCliOps = [...cliOps, ...cliFuncs];

	const envPrefix = cliName.toUpperCase().replaceAll("-", "_");

	const quickStart = [
		heading(2, "Quick Start"),
		codeBlock(`# Run the CLI\nbun run ${cliName} --help`, "bash"),
	].join("\n\n");

	const parameterFilter = (opName: string, paramName: string): boolean =>
		!(injectableByOperation?.get(opName)?.includes(paramName) ?? false);

	return joinSections([
		heading(1, `@${cliName}/cli`),
		cliDescription ?? description(schema),
		quickStart,
		generateEnvironmentVariablesSection(schema, envPrefix),
		operations(allCliOps, {
			exampleGenerator: (op: QualifiedEntry<OperationDef>) =>
				generateCliExample(
					op,
					cliName,
					injectableByOperation?.get(op.name) ?? [],
				),
			exampleLang: "bash",
			parameterFilter,
			schema,
		}),
		entities(getAllEntities(schema)),
		valueObjects(getAllValueObjects(schema)),
		events(schema),
		errors(schema),
	]);
};
