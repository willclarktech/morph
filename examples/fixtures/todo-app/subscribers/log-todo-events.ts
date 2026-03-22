// Subscriber implementation for logTodoEvents

import { Effect, Layer } from "effect";

import { LogTodoEventsSubscriber } from "./index";

export const LogTodoEventsSubscriberLive = Layer.succeed(
	LogTodoEventsSubscriber,
	{
		handle: (event) =>
			Effect.gen(function* () {
				yield* Effect.logInfo(`[Audit] ${event._tag} at ${event.occurredAt}`);

				switch (event._tag) {
					case "TodoCreated": {
						yield* Effect.logDebug(`Todo created: "${event.result.title}"`);
						break;
					}
					case "TodoCompleted": {
						yield* Effect.logDebug(`Todo completed: ${event.result.id}`);
						break;
					}
					case "TodoDeleted": {
						yield* Effect.logDebug(`Todo deleted`);
						break;
					}
				}
			}),
	},
);
