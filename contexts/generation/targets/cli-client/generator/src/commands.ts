import type { OperationDef, QualifiedEntry } from "@morph/domain-schema";

import { toKebabCase } from "@morph/utils";

export const generateLoginCommand = (hasAuth: boolean): string => {
	if (!hasAuth) return "";

	return `
const handleLogin = async (argv: readonly string[]): Promise<number> => {
	const emailIndex = argv.indexOf("--email");
	const email = emailIndex === -1 ? undefined : argv[emailIndex + 1];

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
		.map(([name], index) => `\t\t${name}: argv[${index + 1}],`)
		.join("\n");

	const optionalAssignments = optionalParams
		.map(([name]) => {
			const kebab = toKebabCase(name);
			return `\t\tconst ${name}Index = argv.indexOf("--${kebab}");
		if (${name}Index !== -1 && argv[${name}Index + 1]) {
			params["${name}"] = argv[${name}Index + 1];
		}`;
		})
		.join("\n");

	const commandEnvironmentPart = kebabName.toUpperCase().replaceAll("-", "_");
	const sensitiveAssignments = sensitiveParams
		.map(([name]) => {
			const paramEnvironmentPart = toKebabCase(name)
				.toUpperCase()
				.replaceAll("-", "_");
			const envVariable = `${envPrefix}_${commandEnvironmentPart}_${paramEnvironmentPart}`;
			return `\t\tparams["${name}"] = process.env["${envVariable}"] ?? await promptSecure("${name}: ");`;
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

		if (result === undefined) {
			return 1;
		}
		console.info(JSON.stringify(result, undefined, 2));
		return 0;
	}`;
};
