// Handler implementation for deleteTodo

import { Effect, Layer } from "effect";

import { TodoNotFoundError } from "@todo-app/tasks-dsl";
import { TodoRepository } from "../../services";
import { DeleteTodoHandler } from "./handler";

export const DeleteTodoHandlerLive = Layer.effect(
	DeleteTodoHandler,
	Effect.gen(function* () {
		const todoRepo = yield* TodoRepository;

		return {
			handle: (params) =>
				Effect.gen(function* () {
					// Find the todo
					const todo = yield* todoRepo
						.findById(params.todoId)
						.pipe(Effect.mapError((error) => new TodoNotFoundError({ message: error.message })));
					if (!todo) {
						return yield* Effect.fail(
							new TodoNotFoundError({
								message: `Todo ${params.todoId} not found`,
							}),
						);
					}

					// Delete it
					yield* todoRepo.delete(params.todoId).pipe(Effect.mapError((error) => new TodoNotFoundError({ message: error.message })));
					return true;
				}),
		};
	}),
);
