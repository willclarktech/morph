import type {
	DomainSchema,
	OperationDef,
	QualifiedEntry,
} from "@morph/domain-schema";

import { getInjectableParams } from "@morph/domain-schema";
import { toEnvironmentPrefix, toKebabCase } from "@morph/utils";

export const generateHelpText = (
	cliName: string,
	operations: readonly QualifiedEntry<OperationDef>[],
	hasAuth: boolean,
	schema: DomainSchema,
): string => {
	const configCommands = [
		`  config --api-url <url>    Set API URL`,
		...(hasAuth
			? [
					`  login --email <email>     Authenticate and store token`,
					`  logout                    Clear stored token`,
				]
			: []),
	];

	const operationHelp = operations.map((op) => {
		const kebab = toKebabCase(op.name);
		const opInjectableNames = new Set(
			getInjectableParams(schema, op.name).map((p) => p.paramName),
		);
		const params = Object.entries(op.def.input)
			.filter(
				([name, p]) =>
					!p.sensitive && !p.optional && !opInjectableNames.has(name),
			)
			.map(([name]) => `<${toKebabCase(name)}>`)
			.join(" ");
		const desc = op.def.description ?? "";
		return `  ${kebab} ${params}`.padEnd(35) + desc;
	});

	return `${cliName} - CLI client for remote API

Configuration:
${configCommands.join("\\n")}

Commands:
${operationHelp.join("\\n")}

Environment:
  ${toEnvironmentPrefix(cliName)}_API_URL      Override API URL
  ${toEnvironmentPrefix(cliName)}_API_TOKEN    Override auth token
`;
};
