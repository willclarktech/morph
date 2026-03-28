// Handler implementation for createUser

import { Effect, Layer } from "effect";

import { EmailAlreadyExistsError, userId } from "@blog-app/blog-dsl";
import { IdGenerator, UserRepository } from "../../services";
import { CreateUserHandler } from "./handler";

export const CreateUserHandlerLive = Layer.effect(
	CreateUserHandler,
	Effect.gen(function* () {
		const idGen = yield* IdGenerator;
		const userRepo = yield* UserRepository;

		return {
			handle: (params) =>
				Effect.gen(function* () {
					const result = yield* userRepo
						.findAll()
						.pipe(
							Effect.mapError(
								(error) =>
									new EmailAlreadyExistsError({ message: error.message }),
							),
						);
					const existingUser = result.items.find(
						(user) => user.email === params.email,
					);
					if (existingUser) {
						return yield* Effect.fail(
							new EmailAlreadyExistsError({
								message: `User with email ${params.email} already exists`,
							}),
						);
					}

					const passwordHash = yield* Effect.tryPromise({
						catch: (error) =>
							new EmailAlreadyExistsError({
								message: `Failed to hash password: ${String(error)}`,
							}),
						try: () =>
							Bun.password.hash(params.password, {
								algorithm: "bcrypt",
								cost: 10,
							}),
					});

					const id = yield* idGen.generate();
					const user = {
						id: userId(id),
						email: params.email,
						name: params.name,
						passwordHash,
						role: params.role,
					};

					yield* userRepo
						.save(user)
						.pipe(
							Effect.mapError(
								(error) =>
									new EmailAlreadyExistsError({ message: error.message }),
							),
						);
					return user;
				}),
		};
	}),
);
