/**
 * Password-prompt based AuthService implementation.
 * Prompts for email/password on requireAuth(), verifies against provided lookup.
 */
import { AuthenticationError, AuthService } from "@morphdsl/auth-password-dsl";
import { Effect, Layer, Ref } from "effect";

import { verifyPassword } from "./password";

/**
 * Configuration for password-prompt auth service.
 * @template TUser User type that must have email and passwordHash
 */
export interface PasswordPromptConfig<
	TUser extends { email: string; passwordHash: string },
> {
	/** Find user by email - should be a provided effect with no requirements */
	readonly findByEmail: (
		email: string,
	) => Effect.Effect<TUser | undefined, unknown>;
	/** Prompt for input (shown to user) */
	readonly prompt: (message: string) => Effect.Effect<string>;
	/** Prompt for sensitive input (hidden) */
	readonly promptSecure: (message: string) => Effect.Effect<string>;
}

/**
 * Create a password-prompt AuthService layer.
 * On requireAuth(), prompts for email/password and verifies against the lookup.
 * Caches the authenticated user for subsequent getCurrentUser() calls.
 */
export const createPasswordPromptAuthService = <
	TUser extends { email: string; passwordHash: string },
>(
	config: PasswordPromptConfig<TUser>,
): Layer.Layer<AuthService<TUser>> =>
	Layer.effect(
		AuthService,
		Effect.gen(function* () {
			// Mutable ref to cache authenticated user
			const userRef = yield* Ref.make<TUser | undefined>(undefined);

			return {
				getCurrentUser: () => Ref.get(userRef),

				requireAuth: () =>
					Effect.gen(function* () {
						// Check if already authenticated
						const cached = yield* Ref.get(userRef);
						if (cached !== undefined) {
							return cached;
						}

						// Prompt for credentials
						const email = yield* config.prompt("email: ");
						const password = yield* config.promptSecure("password: ");

						// Look up user
						const user = yield* config
							.findByEmail(email)
							.pipe(
								Effect.catchAll(
									(): Effect.Effect<TUser | undefined> =>
										Effect.succeed(undefined),
								),
							);

						if (user === undefined) {
							return yield* Effect.fail(
								new AuthenticationError({
									code: "UNAUTHENTICATED",
									message: "Invalid email or password",
								}),
							);
						}

						// Verify password
						const valid = yield* verifyPassword(
							password,
							user.passwordHash,
						).pipe(Effect.catchAll(() => Effect.succeed(false)));

						if (!valid) {
							return yield* Effect.fail(
								new AuthenticationError({
									code: "UNAUTHENTICATED",
									message: "Invalid email or password",
								}),
							);
						}

						// Cache and return user
						yield* Ref.set(userRef, user);
						return user;
					}),
			};
		}),
	);
