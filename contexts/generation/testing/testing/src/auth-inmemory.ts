import { AuthenticationError, AuthService } from "@morph/auth-dsl";
import { Context, Effect, Layer, Ref } from "effect";

export interface AuthState<TUser> {
	readonly ref: Ref.Ref<TUser | undefined>;
}

export const AuthState =
	Context.GenericTag<AuthState<unknown>>("@morph/AuthState");

export const AuthStateInMemory: Layer.Layer<AuthState<unknown>> = Layer.effect(
	AuthState,
	Effect.gen(function* () {
		const ref = yield* Ref.make<unknown>(undefined);
		return { ref };
	}),
);

export const AuthServiceInMemory: Layer.Layer<
	AuthService,
	never,
	AuthState<unknown>
> = Layer.effect(
	AuthService,
	Effect.gen(function* () {
		const state = yield* AuthState;
		return {
			getCurrentUser: () => Ref.get(state.ref),
			requireAuth: () =>
				Effect.gen(function* () {
					const user = yield* Ref.get(state.ref);
					if (user === undefined) {
						return yield* Effect.fail(
							new AuthenticationError({
								message: "Not authenticated",
								code: "UNAUTHENTICATED",
							}),
						);
					}
					return user;
				}),
		};
	}),
);

export const setCurrentUser = (
	user: unknown,
): Effect.Effect<void, never, AuthState<unknown>> =>
	Effect.gen(function* () {
		const state = yield* AuthState;
		yield* Ref.set(state.ref, user);
	});
