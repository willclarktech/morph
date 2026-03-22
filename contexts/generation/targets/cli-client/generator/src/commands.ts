import type { OperationDef, QualifiedEntry } from "@morph/domain-schema";

import { toEnvironmentPrefix, toKebabCase } from "@morph/utils";

export const generateLoginCommand = (hasAuth: boolean): string => {
	if (!hasAuth) return "";

	return `
const handleLogin = async (argv: readonly string[]): Promise<number> => {
	const emailIndex = argv.indexOf("--email");
	const email = emailIndex >= 0 ? argv[emailIndex + 1] : undefined;

	if (!email) {
		console.error("Usage: login --email <email>");
		return 1;
	}

	const password = await promptSecure("password: ");

	const client = createClient({ baseUrl: config.getApiUrl() });
	const result = await Effect.runPromise(
		client.login({ email, password }).pipe(
			Effect.catchAll((error) => {
				console.error("Login failed:", error.message);
				return Effect.succeed(undefined);
			}),
		),
	);

	if (result?.token) {
		const current = config.readConfig();
		config.writeConfig({ ...current, token: result.token });
		console.info("Login successful. Token saved.");
		return 0;
	}

	return 1;
};
`;
};

export const generateOperationHandler = (
	op: QualifiedEntry<OperationDef>,
	hasAuth: boolean,
	envPrefix: string,
	injectableNames: ReadonlySet<string>,
): string => {
	const kebabName = toKebabCase(op.name);
	const params = Object.entries(op.def.input).filter(
		([name, p]) => !p.sensitive && !p.optional && !injectableNames.has(name),
	);
	const optionalParams = Object.entries(op.def.input).filter(
		([name, p]) => !p.sensitive && p.optional && !injectableNames.has(name),
	);
	const sensitiveParams = Object.entries(op.def.input).filter(
		([name, p]) => p.sensitive && !injectableNames.has(name),
	);

	const paramAssignments = params
		.map(([name], idx) => `\t\t${name}: argv[${idx + 1}],`)
		.join("\n");

	const optionalAssignments = optionalParams
		.map(([name]) => {
			const kebab = toKebabCase(name);
			return `\t\tconst ${name}Index = argv.indexOf("--${kebab}");
		if (${name}Index >= 0 && argv[${name}Index + 1]) {
			params["${name}"] = argv[${name}Index + 1];
		}`;
		})
		.join("\n");

	const commandEnvPart = kebabName.toUpperCase().replaceAll("-", "_");
	const sensitiveAssignments = sensitiveParams
		.map(([name]) => {
			const paramEnvPart = toKebabCase(name).toUpperCase().replaceAll("-", "_");
			const envVar = `${envPrefix}_${commandEnvPart}_${paramEnvPart}`;
			return `\t\tparams["${name}"] = process.env["${envVar}"] ?? await promptSecure("${name}: ");`;
		})
		.join("\n");

	const requiresAuth = hasAuth;
	const clientConfig = requiresAuth
		? "config.createClientConfig()"
		: "{ baseUrl: config.getApiUrl() }";

	return `\t"${kebabName}": async (argv: readonly string[]) => {
		const params: Record<string, unknown> = {
${paramAssignments}
		};
${optionalAssignments ? `\n${optionalAssignments}\n` : ""}${sensitiveAssignments ? `\n${sensitiveAssignments}\n` : ""}
		const client = createClient(${clientConfig});
		const result = await Effect.runPromise(
			client.${op.name}(params as Parameters<typeof client.${op.name}>[0]).pipe(
				Effect.catchAll((error) => {
					console.error("Error:", error.message);
					return Effect.succeed(undefined);
				}),
			),
		);

		if (result !== undefined) {
			console.info(JSON.stringify(result, undefined, 2));
		}
		return result !== undefined ? 0 : 1;
	}`;
};
