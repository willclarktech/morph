import type { DetectedFeatures } from "../feature-detection";

/**
 * Build auth setup code.
 */
export const buildAuthSetup = (features: DetectedFeatures): string => {
	if (!features.hasAuth) return "";

	if (features.hasPasswordAuth && features.authEntity) {
		const repoName = `${features.authEntity.entityName}Repository`;
		return `
	// Simple bearer auth: look up full user by ID from repository
	// For production, replace with createJwtStrategy
	const authStrategy = createSimpleBearerStrategy(async (userId) => {
		const lookupEffect = Effect.gen(function* () {
			const repo = yield* ${repoName};
			return yield* repo.findById(userId as never);
		});
		const user = await appRuntime.runPromise(
			lookupEffect.pipe(Effect.catchAll(() => Effect.succeed(undefined))),
		);
		return user ?? { id: userId };
	});
`;
	}

	return `
	// Simple bearer auth: Authorization header contains user ID directly
	// For production, replace with createJwtStrategy
	const authStrategy = createSimpleBearerStrategy((userId) =>
		Promise.resolve({ id: userId }),
	);
`;
};

/**
 * Build login route setup for password-based auth.
 */
export const buildLoginRouteSetup = (features: DetectedFeatures): string => {
	if (!features.authEntity || !features.createUserCmd) return "";

	const entityName = features.authEntity.entityName;

	return `
	// Create a shared runtime for both login handler and API
	const appRuntime = ManagedRuntime.make(AppLayer);

	// Build login route handler
	const loginHandler = async (request: Request): Promise<Response> => {
		const body = await request.json() as { email: string; password: string };
		const { email, password } = body;

		// Look up user by email using shared runtime
		const findUserEffect = Effect.gen(function* () {
			const repo = yield* ${entityName}Repository;
			const result = yield* repo.findAll();
			return result.items.find((u: ${entityName}) => u.email === email);
		});

		const user = await appRuntime.runPromise(
			findUserEffect.pipe(
				Effect.catchAll(() => Effect.succeed(undefined)),
			),
		);

		if (!user) {
			return Response.json(
				{ error: { code: "UNAUTHENTICATED", message: "Invalid email or password" } },
				{ status: 401 },
			);
		}

		// Verify password
		const valid = await appRuntime.runPromise(
			verifyPassword(password, user.passwordHash).pipe(
				Effect.catchAll(() => Effect.succeed(false)),
			),
		);

		if (!valid) {
			return Response.json(
				{ error: { code: "UNAUTHENTICATED", message: "Invalid email or password" } },
				{ status: 401 },
			);
		}

		// Return user with token (user.id for SimpleBearerStrategy)
		return Response.json({ ...user, token: user.id });
	};

	const customRoutes = new Map([
		["/auth/login", new Map([["POST", loginHandler]])],
	]);
`;
};
