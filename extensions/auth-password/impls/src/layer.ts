/**
 * Factory for creating password-based AuthService layers.
 *
 * For session management, use @morphdsl/auth-session-impls.
 */
import { AuthenticationError, AuthService } from "@morphdsl/auth-password-dsl";
import { Effect, Layer } from "effect";

/**
 * Simple session data for authentication.
 */
export interface SessionData {
	readonly userId: string;
	readonly createdAt: string;
}

/**
 * Configuration for password-based AuthService.
 *
 * @template TUser The user entity type from the schema
 */
export interface PasswordAuthConfig<TUser> {
	/**
	 * Look up a user by ID. Called when a session exists to hydrate the user.
	 */
	readonly getUserById: (userId: string) => Effect.Effect<TUser | undefined>;

	/**
	 * The current session, if any.
	 */
	readonly session: SessionData | undefined;
}

/**
 * Create an AuthService layer backed by password-based sessions.
 *
 * @template TUser The user entity type from the schema
 */
export const createAuthServicePassword = <TUser>(
	config: PasswordAuthConfig<TUser>,
): Layer.Layer<AuthService<TUser>> => {
	let cachedUser: TUser | undefined;
	let userLoaded = false;

	const loadUser = (): Effect.Effect<TUser | undefined> =>
		Effect.gen(function* () {
			if (userLoaded) {
				return cachedUser;
			}
			if (!config.session) {
				userLoaded = true;
				return;
			}
			const user = yield* config.getUserById(config.session.userId);
			cachedUser = user;
			userLoaded = true;
			return user;
		});

	return Layer.succeed(AuthService, {
		getCurrentUser: () => loadUser(),

		requireAuth: () =>
			Effect.gen(function* () {
				const user = yield* loadUser();
				if (!user) {
					return yield* Effect.fail(
						new AuthenticationError({
							code: "UNAUTHENTICATED",
							message: "Not authenticated. Run 'login' first.",
						}),
					);
				}
				return user;
			}),
	} as AuthService<TUser>);
};
