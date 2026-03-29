/**
 * Error to HTTP status code mapping.
 *
 * Maps domain errors to appropriate HTTP status codes based on error tag patterns.
 */

import type { CodecRegistry } from "@morphdsl/codec-dsl";

import { Effect, Exit } from "effect";

/**
 * Error response body format.
 */
export interface ErrorResponseBody {
	readonly error: {
		readonly code: string;
		readonly message: string;
	};
}

/**
 * Pattern-based error status mapping.
 * Matches error _tag against these patterns (case-insensitive).
 */
const ERROR_STATUS_PATTERNS: readonly [RegExp, number][] = [
	[/notfound/i, 404],
	[/alreadyexists/i, 409],
	[/conflict/i, 409],
	[/validation/i, 400],
	[/invalid/i, 400],
	[/authentication/i, 401],
	[/unauthenticated/i, 401],
	[/authorization/i, 403],
	[/forbidden/i, 403],
	[/ratelimit/i, 429],
];

/**
 * Get HTTP status code from an error.
 *
 * Matches the error's _tag against known patterns:
 * - *NotFound* → 404
 * - *AlreadyExists*, *Conflict* → 409
 * - *Validation*, *Invalid* → 400
 * - *Authentication*, *Unauthenticated* → 401
 * - *Authorization*, *Forbidden* → 403
 * - Default → 500
 */
export const getErrorStatus = (error: unknown): number => {
	if (typeof error !== "object" || error === null) return 500;

	const tag = (error as { _tag?: string })._tag ?? "";

	for (const [pattern, status] of ERROR_STATUS_PATTERNS) {
		if (pattern.test(tag)) return status;
	}

	return 500;
};

/**
 * Extract error code from an error object.
 */
const getErrorCode = (error: unknown): string => {
	if (typeof error !== "object" || error === null) return "UnknownError";
	return (error as { _tag?: string })._tag ?? "UnknownError";
};

/**
 * Extract error message from an error object.
 */
const getErrorMessage = (error: unknown): string => {
	if (error instanceof Error) return error.message;
	if (typeof error === "object" && error !== null) {
		const message = (error as { message?: string }).message;
		if (typeof message === "string") return message;
	}
	return "An error occurred";
};

/**
 * Format an error as an HTTP Response.
 * When a codec registry is provided, encodes the error body in the negotiated format.
 */
export const formatErrorResponse = (
	error: unknown,
	codecRegistry?: CodecRegistry,
	acceptHeader?: string,
): Response => {
	const status = getErrorStatus(error);
	const body: ErrorResponseBody = {
		error: {
			code: getErrorCode(error),
			message: getErrorMessage(error),
		},
	};

	if (codecRegistry && acceptHeader) {
		const negotiateResult = Effect.runSyncExit(
			codecRegistry.negotiate(acceptHeader),
		);
		if (Exit.isSuccess(negotiateResult)) {
			const encodeResult = Effect.runSyncExit(
				negotiateResult.value.encode(body, "error"),
			);
			if (Exit.isSuccess(encodeResult)) {
				return new Response(
					encodeResult.value.body as string | Uint8Array | undefined,
					{
						headers: {
							"content-type": encodeResult.value.contentType,
						},
						status,
					},
				);
			}
		}
	}

	return Response.json(body, { status });
};
