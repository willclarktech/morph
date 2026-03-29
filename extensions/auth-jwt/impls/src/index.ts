/**
 * @morphdsl/auth-jwt-impls - JWT authentication implementations
 *
 * Provides:
 * - Handler implementations (SignToken, VerifyToken, RefreshToken)
 * - JWT signing and verification using Web Crypto API (HS256)
 */

// Handler implementations
export { SignTokenHandler, SignTokenHandlerLive } from "./sign-token";
export { VerifyTokenHandler, VerifyTokenHandlerLive } from "./verify-token";
export { RefreshTokenHandler, RefreshTokenHandlerLive } from "./refresh-token";

// JWT utilities
export { refreshToken, signToken, verifyToken } from "./jwt";

// Layers
export { HandlersLayer } from "./layer";

// Fixtures
export { prose } from "./prose";

// Re-export types and errors from DSL for convenience
export type { JwtPayload } from "@morphdsl/auth-jwt-dsl";
export { TokenExpiredError, TokenInvalidError } from "@morphdsl/auth-jwt-dsl";
