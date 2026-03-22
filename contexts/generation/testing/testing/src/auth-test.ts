import { Effect, Layer } from "effect";

import { AuthenticationError, AuthService } from "@morph/auth-dsl";

export const makeAuthServiceTest = <TUser>(
	user: TUser | undefined,
): Layer.Layer<AuthService<TUser>> =>
	Layer.succeed(AuthService, {
		getCurrentUser: () => Effect.succeed(user),
		requireAuth: () =>
			user !== undefined
				? Effect.succeed(user)
				: Effect.fail(
						new AuthenticationError({
							message: "Not authenticated",
							code: "UNAUTHENTICATED",
						}),
					),
	} as AuthService<TUser>);
