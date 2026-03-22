/**
 * JWT verification using Web Crypto API.
 */

/**
 * JWT configuration using discriminated union for algorithm-specific options.
 */
export type JwtConfig =
	| {
			readonly algorithm: "HS256";
			readonly secret: string;
	  }
	| {
			readonly algorithm: "RS256";
			readonly publicKey: string;
	  };

/**
 * JWT payload with standard claims.
 */
export interface JwtPayload {
	readonly exp?: number;
	readonly iat?: number;
	readonly sub?: string;
}

/**
 * Verify a JWT and extract payload.
 *
 * Uses Web Crypto API for signature verification.
 * Returns undefined for invalid or expired tokens.
 */
export const verifyJwt = async (
	token: string,
	config: JwtConfig,
): Promise<JwtPayload | undefined> => {
	const parts = token.split(".");
	const expectedParts = 3;
	if (parts.length !== expectedParts) return undefined;

	const headerB64 = parts[0];
	const payloadB64 = parts[1];
	const signatureB64 = parts[2];

	// Guard against undefined (TypeScript doesn't narrow from length check)
	if (!headerB64 || !payloadB64 || !signatureB64) return undefined;

	try {
		// Decode payload first to check expiry
		const payload = JSON.parse(base64UrlDecode(payloadB64)) as JwtPayload;

		// Check expiry
		if (payload.exp !== undefined) {
			const nowSeconds = Math.floor(Date.now() / 1000);
			if (payload.exp < nowSeconds) return undefined;
		}

		// Verify signature
		const signatureInput = `${headerB64}.${payloadB64}`;
		const signature = base64UrlToUint8Array(signatureB64);

		const isValid = await verifySignature(signatureInput, signature, config);
		if (!isValid) return undefined;

		return payload;
	} catch {
		return undefined;
	}
};

/**
 * Verify JWT signature using Web Crypto API.
 */
const verifySignature = async (
	data: string,
	signature: Uint8Array,
	config: JwtConfig,
): Promise<boolean> => {
	const encoder = new TextEncoder();
	const dataBytes = encoder.encode(data);

	if (config.algorithm === "HS256") {
		const key = await crypto.subtle.importKey(
			"raw",
			encoder.encode(config.secret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["verify"],
		);
		return crypto.subtle.verify("HMAC", key, signature, dataBytes);
	}

	// RS256
	const key = await crypto.subtle.importKey(
		"spki",
		pemToArrayBuffer(config.publicKey),
		{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
		false,
		["verify"],
	);
	return crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, dataBytes);
};

/**
 * Decode base64url string to UTF-8 string.
 */
const base64UrlDecode = (input: string): string => {
	// Convert base64url to base64
	const base64 = input.replaceAll("-", "+").replaceAll("_", "/");
	// Pad if needed
	const padLength = (4 - (base64.length % 4)) % 4;
	const padded = base64 + "=".repeat(padLength);
	return atob(padded);
};

/**
 * Convert base64url string to Uint8Array.
 */
const base64UrlToUint8Array = (input: string): Uint8Array => {
	const binary = base64UrlDecode(input);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index++) {
		bytes[index] = binary.codePointAt(index) ?? 0;
	}
	return bytes;
};

/**
 * Convert PEM-encoded public key to ArrayBuffer.
 */
const pemToArrayBuffer = (pem: string): ArrayBuffer => {
	const lines = pem.split("\n");
	const base64 = lines
		.filter((line) => !line.startsWith("-----"))
		.join("")
		.trim();
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index++) {
		bytes[index] = binary.codePointAt(index) ?? 0;
	}
	return bytes.buffer;
};
