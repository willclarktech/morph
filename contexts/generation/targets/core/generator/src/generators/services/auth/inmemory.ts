import type { GeneratedFile } from "@morph/domain-schema";

export const generateAuthServiceInMemory = (): GeneratedFile => {
	const content = `// Generated AuthServiceInMemory for e2e testing
// Do not edit - regenerate from schema

export {
	AuthState,
	AuthStateInMemory,
	AuthServiceInMemory,
	setCurrentUser,
} from "@morph/testing";
`;

	return { content, filename: "services/auth-service-inmemory.ts" };
};
