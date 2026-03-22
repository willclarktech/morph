/**
 * JWT implementation using Web Crypto API (HS256).
 *
 * Provides sign, verify, and refresh operations for JWT tokens.
 * No external dependencies - uses native Web Crypto.
 */
import { Effect } from "effect";

import type { JwtPayload } from "@morph/auth-jwt-dsl";
import { TokenExpiredError, TokenInvalidError } from "@morph/auth-jwt-dsl";

const textEncoder = new TextEncoder();

/**
 * Base64URL encode a Uint8Array.
 */
const base64UrlEncode = (data: Uint8Array): string => {
	let binary = "";
	for (const byte of data) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
};

/**
 * Base64URL decode a string to Uint8Array.
 */
const base64UrlDecode = (str: string): Uint8Array => {
	const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
	const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
};

/**
 * Import a secret key for HMAC-SHA256.
 */
const importKey = async (secret: string): Promise<CryptoKey> =>
	crypto.subtle.importKey(
		"raw",
		textEncoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);

/**
 * Sign data with HMAC-SHA256.
 */
const hmacSign = async (key: CryptoKey, data: string): Promise<Uint8Array> => {
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		textEncoder.encode(data),
	);
	return new Uint8Array(signature);
};

/**
 * Verify HMAC-SHA256 signature.
 */
const hmacVerify = async (
	key: CryptoKey,
	data: string,
	signature: Uint8Array,
): Promise<boolean> =>
	crypto.subtle.verify("HMAC", key, signature, textEncoder.encode(data));

const JWT_HEADER = { alg: "HS256", typ: "JWT" };
const DEFAULT_EXPIRY_SECONDS = 3600; // 1 hour

/**
 * Sign a JWT payload with a secret key.
 */
export const signToken = (
	payload: JwtPayload,
	secret: string,
): Effect.Effect<string, never> =>
	Effect.promise(async () => {
		const key = await importKey(secret);

		const headerBase64 = base64UrlEncode(
			textEncoder.encode(JSON.stringify(JWT_HEADER)),
		);
		const payloadBase64 = base64UrlEncode(
			textEncoder.encode(JSON.stringify(payload)),
		);

		const dataToSign = `${headerBase64}.${payloadBase64}`;
		const signature = await hmacSign(key, dataToSign);
		const signatureBase64 = base64UrlEncode(signature);

		return `${dataToSign}.${signatureBase64}`;
	});

/**
 * Parse a JWT token into its components without verification.
 */
const parseToken = (
	token: string,
): Effect.Effect<
	{
		header: string;
		payload: string;
		signature: string;
		payloadData: JwtPayload;
	},
	TokenInvalidError
> =>
	Effect.try({
		try: () => {
			const parts = token.split(".");
			if (parts.length !== 3) {
				throw new Error("Invalid token format: expected 3 parts");
			}
			const header = parts[0] as string;
			const payload = parts[1] as string;
			const signature = parts[2] as string;
			const payloadBytes = base64UrlDecode(payload);
			const payloadJson = new TextDecoder().decode(payloadBytes);
			const payloadData = JSON.parse(payloadJson) as JwtPayload;
			return { header, payload, signature, payloadData };
		},
		catch: (error) =>
			new TokenInvalidError({
				reason: `Failed to parse token: ${error instanceof Error ? error.message : String(error)}`,
			}),
	});

/**
 * Verify a JWT token signature.
 */
const verifySignature = (
	header: string,
	payload: string,
	signature: string,
	secret: string,
): Effect.Effect<void, TokenInvalidError> =>
	Effect.tryPromise({
		try: async () => {
			const key = await importKey(secret);
			const dataToVerify = `${header}.${payload}`;
			const signatureBytes = base64UrlDecode(signature);
			const isValid = await hmacVerify(key, dataToVerify, signatureBytes);
			if (!isValid) {
				throw new Error("Signature verification failed");
			}
		},
		catch: (error) =>
			new TokenInvalidError({
				reason:
					error instanceof Error
						? error.message
						: "Signature verification failed",
			}),
	});

/**
 * Check if a token has expired.
 */
const checkExpiration = (
	payload: JwtPayload,
): Effect.Effect<void, TokenExpiredError> =>
	Effect.gen(function* () {
		if (payload.exp !== undefined) {
			const now = Math.floor(Date.now() / 1000);
			if (payload.exp < now) {
				return yield* Effect.fail(
					new TokenExpiredError({
						expiredAt: new Date(payload.exp * 1000).toISOString(),
					}),
				);
			}
		}
	});

/**
 * Verify a JWT token and extract its payload.
 */
export const verifyToken = (
	token: string,
	secret: string,
): Effect.Effect<JwtPayload, TokenInvalidError | TokenExpiredError> =>
	Effect.gen(function* () {
		const { header, payload, signature, payloadData } =
			yield* parseToken(token);
		yield* verifySignature(header, payload, signature, secret);
		yield* checkExpiration(payloadData);
		return payloadData;
	});

/**
 * Refresh a JWT token with a new expiration time.
 * Verifies the current token and creates a new one with updated iat/exp.
 */
export const refreshToken = (
	token: string,
	secret: string,
	expiresInSeconds?: number,
): Effect.Effect<string, TokenInvalidError | TokenExpiredError> =>
	Effect.gen(function* () {
		const payload = yield* verifyToken(token, secret);

		const now = Math.floor(Date.now() / 1000);
		const expiry = expiresInSeconds ?? DEFAULT_EXPIRY_SECONDS;

		const newPayload: JwtPayload = {
			...payload,
			iat: now,
			exp: now + expiry,
		};

		return yield* signToken(newPayload, secret);
	});
