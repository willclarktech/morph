// Subscriber implementation for logContactEvents

import { Effect, Layer } from "effect";

import { LogContactEventsSubscriber } from ".";

export const LogContactEventsSubscriberLive = Layer.succeed(
	LogContactEventsSubscriber,
	{
		handle: (event) =>
			Effect.gen(function* () {
				yield* Effect.logInfo(
					`[Audit] ${event._tag} at ${event.occurredAt}`,
				);
			}),
	},
);
