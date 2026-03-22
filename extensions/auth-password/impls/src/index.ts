/**
 * @morph/auth-password-impls - Password hashing and verification
 *
 * Provides:
 * - Handler implementations (HashPassword, VerifyPassword)
 * - Password hashing (bcrypt via Bun.password)
 *
 * For session management, use @morph/auth-session-impls.
 */

// Handler implementations
export { HashPasswordHandler, HashPasswordHandlerLive } from "./hash-password";
export {
	VerifyPasswordHandler,
	VerifyPasswordHandlerLive,
} from "./verify-password";

// Runtime utilities
export * from "./layer";
export * from "./password";
export * from "./prompt";
export * from "./text";

// Fixtures
export { prose } from "./prose";

// Re-export types from DSL
export {
	AuthenticationError,
	AuthorizationError,
	AuthService,
	PasswordHashError,
	PasswordVerifyError,
} from "@morph/auth-password-dsl";
