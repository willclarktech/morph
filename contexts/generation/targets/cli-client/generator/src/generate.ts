import type {
	DomainSchema,
	GeneratedFile,
	GenerationResult,
} from "@morph/domain-schema";

import {
	getAllOperations,
	getInjectableParams,
	schemaHasAuthRequirement,
} from "@morph/domain-schema";
import { sortImports, toEnvironmentPrefix } from "@morph/utils";

import { generateLoginCommand, generateOperationHandler } from "./commands";
import { generateHelpText } from "./help";
import { generateClientCliReadme } from "./readme";

export interface GenerateClientCliOptions {
	readonly clientPackage: string;
	readonly cliDescription?: string;
	readonly cliName: string;
	readonly dslPackage: string;
	readonly packageDir?: string;
	readonly schema: DomainSchema;
	readonly sourceDir?: string;
}

export const generate = (
	options: GenerateClientCliOptions,
): GenerationResult => {
	const {
		clientPackage,
		cliDescription,
		cliName,
		dslPackage: _dslPackage,
		packageDir,
		schema,
		sourceDir = "src",
	} = options;

	const prefix = packageDir ? `${packageDir}/` : "";
	const sourcePrefix = `${prefix}${sourceDir}/`;
	const envPrefix = toEnvironmentPrefix(cliName);
	const hasAuth = schemaHasAuthRequirement(schema);

	const apiOperations = getAllOperations(schema).filter((op) =>
		op.def.tags.includes("@cli-client"),
	);

	const hasSensitiveOps = apiOperations.some((op) =>
		Object.values(op.def.input).some((p) => p.sensitive),
	);
	const needsSecurePrompt = hasAuth || hasSensitiveOps;

	const operationHandlers = apiOperations.map((op) => {
		const injectableNames = new Set(
			getInjectableParams(schema, op.name).map((p) => p.paramName),
		);
		return generateOperationHandler(op, hasAuth, envPrefix, injectableNames);
	});

	const helpText = generateHelpText(cliName, apiOperations, hasAuth, schema);

	const generatorCliImports = [
		"createConfigManager",
		"createRepl",
		...(needsSecurePrompt ? ["promptSecure"] : []),
	];
	const importBlock = sortImports(
		[
			`import { createClient } from "${clientPackage}";`,
			`import { Effect } from "effect";`,
			`import { ${generatorCliImports.join(", ")} } from "@morph/runtime-cli";`,
		].join("\n"),
	);

	const entryContent = `${importBlock}

const config = createConfigManager("${cliName}", "${envPrefix}");
${hasAuth ? generateLoginCommand(hasAuth) : ""}
const HELP_TEXT = \`${helpText}\`;

const commands: Record<string, (argv: readonly string[]) => Promise<number>> = {
	config: async (argv) => {
		const apiUrlIndex = argv.indexOf("--api-url");
		const apiUrl = apiUrlIndex === -1 ? undefined : argv[apiUrlIndex + 1];

		if (apiUrl) {
			const current = config.readConfig();
			config.writeConfig({ ...current, apiUrl });
			console.info(\`API URL set to: \${apiUrl}\`);
			return 0;
		}

		// Show current config
		const current = config.readConfig();
		console.info(JSON.stringify(current, undefined, 2));
		return 0;
	},
${
	hasAuth
		? `	login: handleLogin,
	logout: async () => {
		const { token: _, ...rest } = config.readConfig();
		config.writeConfig(rest);
		console.info("Logged out.");
		return 0;
	},`
		: ""
}
${operationHandlers.join(",\n")}
};

const dispatch = async (argv: readonly string[]): Promise<number> => {
	const command = argv[0];

	if (!command || command === "--help" || command === "-h") {
		console.info(HELP_TEXT);
		return 0;
	}

	const handler = commands[command];
	if (!handler) {
		console.error(\`Unknown command: \${command}\\n\`);
		console.error(HELP_TEXT);
		return 1;
	}

	return handler(argv);
};

const main = async (): Promise<number> => {
	const argv = process.argv.slice(2);

	if (argv[0] === "console") {
		await createRepl({
			execute: dispatch,
			name: "${cliName}",
		});
		return 0;
	}

	return dispatch(argv);
};

const code = await main();
process.exit(code);
`;

	const files: GeneratedFile[] = [
		{
			content: entryContent,
			filename: `${sourcePrefix}index.ts`,
		},
		{
			content: generateClientCliReadme(schema, cliName, cliDescription),
			filename: `${prefix}README.md`,
		},
	];

	return { files };
};
