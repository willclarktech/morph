/**
 * Test file building blocks - pattern-focused, not app-focused.
 */

export interface TestPackages {
	dsl: string;
	scenarios: string;
	core?: string;
	properties?: string;
}

/**
 * Build standard test file imports.
 */
export const buildTestImports = (
	runnerPackage: string,
	runnerName: string,
	packages: TestPackages,
	extraImports?: readonly string[],
): string => {
	const lines = [`import { ${runnerName} } from "${runnerPackage}";`];
	if (packages.core) {
		lines.push(`import { ${packages.core} } from "@${packages.core}/core";`);
	}
	if (extraImports) {
		lines.push(...extraImports);
	}
	lines.push(
		`import { prose } from "${packages.core}";`,
		`import { scenarios } from "${packages.scenarios}";`,
		`import { expect, test } from "bun:test";`,
		`import path from "node:path";`,
	);
	return lines.join("\n");
};

/**
 * Build token-based auth config (used by api, mcp, client runners).
 * Pattern: authOperation creates a user, tokenField extracts the ID.
 */
export const buildTokenAuthConfig = (hasAuth: boolean): string =>
	hasAuth
		? `auth: {
		authOperation: "createUser",
		tokenField: "id",
	},
	`
		: "";

/**
 * Build credential-based auth config (used by CLI runner).
 * Pattern: username/password params for credential tracking.
 */
export const buildCredentialAuthConfig = (
	appName: string,
	hasAuth: boolean,
): string =>
	hasAuth
		? `\n\tappName: "${appName}",\n\tauthParams: { emailParam: "email", passwordParam: "password" },`
		: `\n\tappName: "${appName}",`;

/**
 * Build cwd resolution relative to test file location.
 */
export const buildCwdResolution = (levelsUp = 2): string => {
	const dots = Array(levelsUp).fill('"..').join(", ");
	return `const cwd = path.resolve(import.meta.dir, ${dots}");`;
};

/**
 * Build test entry point.
 */
export const buildTestEntry = (testName = "scenarios"): string => `
test("${testName}", async () => {
	const result = await runner.runAllAndPrint(${testName});
	expect(result.failed).toBe(0);
});
`;
