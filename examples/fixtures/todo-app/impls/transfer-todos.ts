// Handler implementation for transferTodos - domain service spanning User and Todo aggregates

import { Effect, Layer } from "effect";

import { SameUserError, UserNotFoundError } from "@todo-app/tasks-dsl";
import { TodoRepository, UserRepository } from "../../services";
import { TransferTodosHandler } from "./handler";

export const TransferTodosHandlerLive = Layer.effect(
	TransferTodosHandler,
	Effect.gen(function* () {
		const todoRepo = yield* TodoRepository;
		const userRepo = yield* UserRepository;

		return {
			handle: (params) =>
				Effect.gen(function* () {
					// Validate: cannot transfer to self
					if (params.fromUserId === params.toUserId) {
						return yield* Effect.fail(
							new SameUserError({
								message: "Cannot transfer todos to the same user",
							}),
						);
					}

					// Verify source user exists
					const fromUser = yield* userRepo
						.findById(params.fromUserId)
						.pipe(Effect.mapError((e) => new UserNotFoundError({ message: e.message })));
					if (!fromUser) {
						return yield* Effect.fail(
							new UserNotFoundError({
								message: `Source user ${params.fromUserId} not found`,
							}),
						);
					}

					// Verify target user exists
					const toUser = yield* userRepo
						.findById(params.toUserId)
						.pipe(Effect.mapError((e) => new UserNotFoundError({ message: e.message })));
					if (!toUser) {
						return yield* Effect.fail(
							new UserNotFoundError({
								message: `Target user ${params.toUserId} not found`,
							}),
						);
					}

					// Get all todos for the source user
					const allTodosResult = yield* todoRepo.findAll().pipe(Effect.mapError((e) => new UserNotFoundError({ message: e.message })));
					const todosToTransfer = allTodosResult.items.filter(
						(todo) => todo.userId === params.fromUserId,
					);

					// Transfer each todo to the target user
					for (const todo of todosToTransfer) {
						const updatedTodo = { ...todo, userId: params.toUserId };
						yield* todoRepo.save(updatedTodo).pipe(Effect.mapError((e) => new UserNotFoundError({ message: e.message })));
					}

					return todosToTransfer.length;
				}),
		};
	}),
);
