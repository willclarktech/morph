// Handler implementation for createTodo

import { Effect, Layer } from "effect";

import { todoId, UserNotFoundError } from "@todo-app/tasks-dsl";
import { IdGenerator, TodoRepository, UserRepository } from "../../services";
import { CreateTodoHandler } from "./handler";

export const CreateTodoHandlerLive = Layer.effect(
	CreateTodoHandler,
	Effect.gen(function* () {
		const idGen = yield* IdGenerator;
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

					// Generate ID and create todo
					const id = yield* idGen.generate();
					const todo = {
						id: todoId(id),
						title: params.title,
						userId: params.userId,
						completed: false,
						createdAt: new Date().toISOString(),
						priority: options.priority ?? ("medium" as const),
						tags: options.tags ?? [],
						...(options.dueDate ? { dueDate: options.dueDate } : {}),
					};

					yield* todoRepo.save(todo).pipe(Effect.mapError((error) => new UserNotFoundError({ message: error.message })));
					return todo;
				}),
		};
	}),
);
