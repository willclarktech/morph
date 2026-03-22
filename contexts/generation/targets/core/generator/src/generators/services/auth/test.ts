import type { GeneratedFile } from "@morph/domain-schema";

export const generateAuthServiceTest = (): GeneratedFile => {
	const content = `// Generated AuthService test helper
// Do not edit - regenerate from schema

export { makeAuthServiceTest } from "@morph/testing";
`;

	return { content, filename: "services/auth-service-test.ts" };
};
