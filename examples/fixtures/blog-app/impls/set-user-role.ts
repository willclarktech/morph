// Handler implementation for setUserRole

import { Effect, Layer } from "effect";

import { UserNotFoundError } from "@blog-app/blog-dsl";
import { UserRepository } from "../../services";
import { SetUserRoleHandler } from "./handler";

export const SetUserRoleHandlerLive = Layer.effect(
	SetUserRoleHandler,
	Effect.gen(function* () {
		const userRepo = yield* UserRepository;

		return {
			handle: (params) =>
				Effect.gen(function* () {
					const user = yield* userRepo
						.findById(params.userId)
						.pipe(
							Effect.mapError(
								(e) => new UserNotFoundError({ message: e.message }),
							),
						);
					if (!user) {
						return yield* Effect.fail(
							new UserNotFoundError({
								message: `User ${params.userId} not found`,
							}),
						);
					}

					const updated = { ...user, role: params.role };

					yield* userRepo
						.save(updated)
						.pipe(
							Effect.mapError(
								(e) => new UserNotFoundError({ message: e.message }),
							),
						);
					return updated;
				}),
		};
	}),
);
