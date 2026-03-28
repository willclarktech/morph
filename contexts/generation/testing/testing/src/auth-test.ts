import { AuthenticationError, AuthService } from "@morph/auth-dsl";
import { Effect, Layer } from "effect";

export const makeAuthServiceTest = <TUser>(
	user: TUser | undefined,
): Layer.Layer<AuthService<TUser>> =>
	Layer.succeed(AuthService, {
		getCurrentUser: () => Effect.succeed(user),
		requireAuth: () =>
			user === undefined
				? Effect.fail(
						new AuthenticationError({
							message: "Not authenticated",
							code: "UNAUTHENTICATED",
						}),
					)
				: Effect.succeed(user),
	} as AuthService<TUser>);
