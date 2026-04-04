// Subscriber implementation for logPasteEvents

import { Effect, Layer } from "effect";

import { LogPasteEventsSubscriber } from "./index";

export const LogPasteEventsSubscriberLive = Layer.succeed(
	LogPasteEventsSubscriber,
	{
		handle: (event) =>
			Effect.gen(function* () {
				yield* Effect.logInfo(`[Audit] ${event._tag} at ${event.occurredAt}`);

				switch (event._tag) {
					case "PasteCreated": {
						yield* Effect.logDebug(
							`Paste created: "${event.result.title || "untitled"}"`,
						);
						break;
					}
					case "PasteDeleted": {
						yield* Effect.logDebug(`Paste deleted`);
						break;
					}
				}
			}),
	},
);
