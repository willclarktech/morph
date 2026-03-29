import type { GeneratedFile } from "@morphdsl/domain-schema";

export const generateAuthServiceTest = (): GeneratedFile => {
	const content = `// Generated AuthService test helper
// Do not edit - regenerate from schema

export { makeAuthServiceTest } from "@morphdsl/testing";
`;

	return { content, filename: "services/auth-service-test.ts" };
};
