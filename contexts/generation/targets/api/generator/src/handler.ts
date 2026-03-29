/**
 * Route handler creation with runtime and auth injection.
 */
import type { CodecRegistry } from "@morphdsl/codec-dsl";
import type { InjectableParam } from "@morphdsl/domain-schema";
import type { AnyOperation } from "@morphdsl/operation";
import type { Context, ManagedRuntime } from "effect";
import type * as EffectType from "effect/Effect";

import { jsonStringify } from "@morphdsl/utils";
import { Cause, Effect, Exit } from "effect";
import * as S from "effect/Schema";

import type { AuthService, AuthStrategy } from "./auth";

import { AuthServiceTag, createRequestAuthService } from "./auth";
import { formatErrorResponse } from "./errors";
import { extractParameters } from "./params";

/**
 * Handler function type for a route.
 */
export type RouteHandler = (
	request: Request,
	pathParameters: Record<string, string>,
) => Promise<Response>;

/**
 * Create a route handler for an operation using a managed runtime.
 * The runtime ensures layer state persists across requests.
 * Auth is extracted per-request and injected as AuthService.
 * Injectable params are filled from auth context when missing.
 */
export const createHandlerWithRuntime = <R>(
	operation: AnyOperation,
	runtime: ManagedRuntime.ManagedRuntime<R, never>,
	authStrategy?: AuthStrategy,
	injectableParameters?: readonly InjectableParam[],
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accepts any AuthService-compatible tag
	authServiceTag?: Context.Tag<any, any>,
	codecRegistry?: CodecRegistry,
): RouteHandler => {
	/* eslint-disable @typescript-eslint/no-explicit-any -- generic auth service tag erasure */
	const authTag = (authServiceTag ?? AuthServiceTag) as Context.Tag<
		AuthService<any>,
		AuthService<any>
	>;
	/* eslint-enable @typescript-eslint/no-explicit-any */
	return async (request: Request, pathParameters: Record<string, string>) => {
		// Extract user from request first (needed for param injection)
		const user = authStrategy
			? await authStrategy.extractUser(request)
			: undefined;

		// Extract parameters with injection context
		// User is cast to the expected shape (auth strategies return at least { id: string })
		const { options, params } = await extractParameters(
			request,
			operation,
			pathParameters,
			{
				codecRegistry,
				currentUser: user as { readonly id: string } | undefined,
				injectableParams: injectableParameters,
			},
		);

		// Validate parameters against schema
		const paramsSchema = operation.params as S.Schema<unknown, unknown>;
		const paramsDecodeResult = S.decodeUnknownEither(paramsSchema)(params);
		if (paramsDecodeResult._tag === "Left") {
			const parseError = paramsDecodeResult.left;
			return Response.json(
				{ error: "Validation error", message: parseError.message },
				{ status: 400 },
			);
		}
		const validatedParameters = paramsDecodeResult.right;

		// Create per-request AuthService and inject it
		const authService = createRequestAuthService(user);
		const effect = (
			operation.execute(validatedParameters, options) as EffectType.Effect<
				unknown,
				unknown,
				R
			>
		).pipe(Effect.provideService(authTag, authService));

		const exit = await runtime.runPromiseExit(effect);

		if (Exit.isSuccess(exit)) {
			if (codecRegistry) {
				const acceptHeader = request.headers.get("accept") ?? "*/*";
				const negotiateResult = await Effect.runPromiseExit(
					codecRegistry.negotiate(acceptHeader),
				);
				if (Exit.isSuccess(negotiateResult)) {
					const codec = negotiateResult.value;
					const encodeResult = await Effect.runPromiseExit(
						codec.encode(exit.value, operation.name),
					);
					if (Exit.isSuccess(encodeResult)) {
						return new Response(
							encodeResult.value.body as string | Uint8Array | undefined,
							{
								headers: {
									"content-type": encodeResult.value.contentType,
								},
							},
						);
					}
				}
			}
			// Fallback to JSON
			return new Response(jsonStringify(exit.value), {
				headers: { "content-type": "application/json" },
			});
		}

		const error = Cause.squash(exit.cause);
		const acceptHeader = request.headers.get("accept") ?? undefined;
		return formatErrorResponse(error, codecRegistry, acceptHeader);
	};
};
