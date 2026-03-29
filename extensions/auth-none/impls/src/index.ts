/**
 * @morphdsl/auth-none-impls - No authentication implementations
 *
 * Provides passthrough handlers for public APIs or development.
 * - getAnonymousUser: Always returns void (no user)
 * - requireAuth: Always fails with NoAuthEnabledError
 */

// Handler implementations
export {
	GetAnonymousUserHandler,
	GetAnonymousUserHandlerLive,
} from "./get-anonymous-user";
export { RequireAuthHandler, RequireAuthHandlerLive } from "./require-auth";

// Layers
export { HandlersLayer } from "./layer";

// Fixtures
export { prose } from "./prose";

// Re-export errors from DSL for convenience
export { NoAuthEnabledError } from "@morphdsl/auth-none-dsl";
