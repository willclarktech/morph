/**
 * Auth layer code generation for CLI apps.
 */

/**
 * Generate auth layer code for CLI.
 */
export const generateAuthLayerCode = (envPrefix: string): string => `
	// Create auth layer with password prompt (or env var credentials for testing)
	const AuthLayer = Layer.effect(
		AuthService,
		Effect.gen(function* () {
			// Capture dependencies at layer construction time
			const userRepo = yield* UserRepository;
			const userRef = yield* Ref.make<User | undefined>(undefined);

			return {
				getCurrentUser: () => Ref.get(userRef),
				requireAuth: () =>
					Effect.gen(function* () {
						// Check if already authenticated
						const cached = yield* Ref.get(userRef);
						if (cached !== undefined) {
							return cached;
						}

						// Check for test credentials from environment (e.g., TODO_APP_EMAIL)
						const envEmail = process.env["${envPrefix}_EMAIL"];
						const envPassword = process.env["${envPrefix}_PASSWORD"];

						// Use env vars if set, otherwise prompt interactively
						const email = envEmail ?? (yield* Effect.promise(() => promptInput("email: ")));
						const password = envPassword ?? (yield* Effect.promise(() => promptSecure("password: ")));

						// Look up user by email
						const result = yield* userRepo.findAll().pipe(
							Effect.catchAll(() => Effect.succeed({ items: [] as readonly User[], total: 0 })),
						);
						const user = result.items.find((u) => u.email === email);

						if (user === undefined) {
							return yield* Effect.fail(
								new AuthenticationError({
									code: "UNAUTHENTICATED",
									message: "Invalid email or password",
								}),
							);
						}

						// Verify password using the auth-password operation
						const valid = yield* verifyPassword(password, user.passwordHash).pipe(
							Effect.catchAll(() => Effect.succeed(false)),
						);

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
	).pipe(Layer.provide(storageLayer));`;
