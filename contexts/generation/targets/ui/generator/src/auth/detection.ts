/**
 * Auth operation detection from schema.
 */
import type { OperationDef, QualifiedEntry } from "@morphdsl/domain-schema";

/**
 * Auth operations detection result.
 */
export interface AuthOperations {
	readonly login: QualifiedEntry<OperationDef> | undefined;
	readonly register: QualifiedEntry<OperationDef> | undefined;
}

/**
 * Detect login and register operations from schema.
 * - Login: has password input, name includes "login/signin/authenticate"
 * - Register: has password input, name includes "create" + "user"
 */
export const detectAuthOperations = (
	ops: readonly QualifiedEntry<OperationDef>[],
): AuthOperations => {
	let login: QualifiedEntry<OperationDef> | undefined;
	let register: QualifiedEntry<OperationDef> | undefined;

	for (const op of ops) {
		// Check if operation has a password/sensitive input
		const hasSensitiveInput = Object.values(op.def.input).some(
			(param) => param.sensitive === true,
		);
		if (!hasSensitiveInput) continue;

		const nameLower = op.name.toLowerCase();

		// Detect register (createUser pattern)
		if (
			(nameLower.startsWith("create") || nameLower.startsWith("register")) &&
			nameLower.includes("user")
		) {
			register = op;
		}
		// Detect login
		else if (
			nameLower.includes("login") ||
			nameLower.includes("authenticate") ||
			nameLower.includes("signin")
		) {
			login = op;
		}
	}

	return { login, register };
};
