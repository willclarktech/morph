// Handler implementation for listTodos

import { Effect, Layer } from "effect";

import { UserNotFoundError } from "@todo/tasks-dsl";
import { TodoRepository, UserRepository } from "../../services";
import { ListTodosHandler } from "./handler";

export const ListTodosHandlerLive = Layer.effect(
	ListTodosHandler,
	Effect.gen(function* () {
		const todoRepo = yield* TodoRepository;
		const userRepo = yield* UserRepository;

		return {
			handle: (params, options) =>
				Effect.gen(function* () {
					// Verify user exists
					const user = yield* userRepo
						.findById(params.userId)
						.pipe(Effect.mapError((error) => new UserNotFoundError({ message: error.message })));
					if (!user) {
						return yield* Effect.fail(
							new UserNotFoundError({
								message: `User ${params.userId} not found`,
							}),
						);
					}

					// Get all todos and filter by user
					const result = yield* todoRepo.findAll().pipe(Effect.mapError((error) => new UserNotFoundError({ message: error.message })));
					const userTodos = result.items.filter(
						(todo) => todo.userId === params.userId,
					);

					// Filter by completion status if requested
					const includeCompleted = options.includeCompleted ?? true;
					if (!includeCompleted) {
						return userTodos.filter((todo) => !todo.completed);
					}

					return userTodos;
				}),
		};
	}),
);
