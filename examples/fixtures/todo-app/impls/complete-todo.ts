// Handler implementation for completeTodo

import { Effect, Layer } from "effect";

import { AlreadyCompletedError, TodoNotFoundError } from "@todo-app/tasks-dsl";
import { TodoRepository } from "../../services";
import { CompleteTodoHandler } from "./handler";

export const CompleteTodoHandlerLive = Layer.effect(
	CompleteTodoHandler,
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

					// Check if already completed
					if (todo.completed) {
						return yield* Effect.fail(
							new AlreadyCompletedError({
								message: `Todo ${params.todoId} is already completed`,
							}),
						);
					}

					// Mark as completed
					const completedTodo = { ...todo, completed: true };
					yield* todoRepo.save(completedTodo).pipe(Effect.mapError((error) => new TodoNotFoundError({ message: error.message })));
					return completedTodo;
				}),
		};
	}),
);
