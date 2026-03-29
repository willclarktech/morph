/**
 * @morphdsl/auth-session-impls - Session management implementations
 *
 * Provides:
 * - Handler implementations (CreateSession, ValidateSession, DestroySession)
 * - Session storage abstraction with pluggable backends
 * - Default in-memory session store
 */

// Handler implementations
export {
	CreateSessionHandler,
	CreateSessionHandlerLive,
} from "./create-session";
export {
	ValidateSessionHandler,
	ValidateSessionHandlerLive,
} from "./validate-session";
export {
	DestroySessionHandler,
	DestroySessionHandlerLive,
} from "./destroy-session";

// Session store utilities
export {
	createFileSessionStore,
	createSession,
	destroySession,
	generateSessionId,
	isSessionExpired,
	resetSessionStore,
	type SessionStore,
	setSessionStore,
	validateSession,
} from "./session-store";

// Layers
export { HandlersLayer } from "./layer";

// Fixtures
export { prose } from "./prose";

// Re-export types and errors from DSL for convenience
export type { Session } from "@morphdsl/auth-session-dsl";
export {
	SessionExpiredError,
	SessionNotFoundError,
	SessionStorageError,
} from "@morphdsl/auth-session-dsl";
