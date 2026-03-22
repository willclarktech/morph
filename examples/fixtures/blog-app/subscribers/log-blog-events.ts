// Subscriber implementation for logBlogEvents

import { Effect, Layer } from "effect";

import { LogBlogEventsSubscriber } from "./index";

export const LogBlogEventsSubscriberLive = Layer.succeed(
	LogBlogEventsSubscriber,
	{
		handle: (event) =>
			Effect.gen(function* () {
				yield* Effect.logInfo(`[Audit] ${event._tag} at ${event.occurredAt}`);

				switch (event._tag) {
					case "PostCreated": {
						yield* Effect.logDebug(
							`Post created: "${event.result.title}"`,
						);
						break;
					}
					case "PostPublished": {
						yield* Effect.logDebug(
							`Post published: ${event.result.id}`,
						);
						break;
					}
					case "PostDeleted": {
						yield* Effect.logDebug(`Post deleted`);
						break;
					}
				}
			}),
	},
);
