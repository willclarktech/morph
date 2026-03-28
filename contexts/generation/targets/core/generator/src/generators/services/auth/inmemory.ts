import type { GeneratedFile } from "@morph/domain-schema";

export const generateAuthServiceInMemory = (): GeneratedFile => {
	const content = `// Generated AuthServiceInMemory for e2e testing
// Do not edit - regenerate from schema

export {
	AuthServiceInMemory,
	AuthState,
	AuthStateInMemory,
	setCurrentUser,
} from "@morph/testing";
`;

	return { content, filename: "services/auth-service-inmemory.ts" };
};
