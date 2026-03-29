/**
 * @morphdsl/auth-apikey-impls - API key authentication implementations
 *
 * Provides:
 * - Handler implementations (CreateApiKey, ValidateApiKey, RevokeApiKey)
 * - API key storage abstraction with pluggable backends
 * - Default in-memory store
 */

// Handler implementations
export { CreateApiKeyHandler, CreateApiKeyHandlerLive } from "./create-apikey";
export {
	ValidateApiKeyHandler,
	ValidateApiKeyHandlerLive,
} from "./validate-apikey";
export { RevokeApiKeyHandler, RevokeApiKeyHandlerLive } from "./revoke-apikey";

// API key store utilities
export {
	type ApiKeyStore,
	createApiKey,
	generateApiKey,
	hashApiKey,
	isApiKeyExpired,
	resetApiKeyStore,
	revokeApiKey,
	setApiKeyStore,
	validateApiKey,
} from "./apikey-store";

// Layers
export { HandlersLayer } from "./layer";

// Fixtures
export { prose } from "./prose";

// Re-export types and errors from DSL for convenience
export type { ApiKey, ApiKeyWithSecret } from "@morphdsl/auth-apikey-dsl";
export {
	ApiKeyExpiredError,
	ApiKeyInvalidError,
	ApiKeyStorageError,
} from "@morphdsl/auth-apikey-dsl";
