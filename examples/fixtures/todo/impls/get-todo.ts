// Handler implementation for getTodo

import { Effect, Layer } from "effect";

import { TodoNotFoundError } from "@todo/tasks-dsl";
import { TodoRepository } from "../../services";
import { GetTodoHandler } from "./handler";

export const GetTodoHandlerLive = Layer.effect(
	GetTodoHandler,
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

					return todo;
				}),
		};
	}),
);
