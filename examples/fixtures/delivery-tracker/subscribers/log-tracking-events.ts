// Subscriber implementation for logTrackingEvents

import { Effect, Layer } from "effect";

import { LogTrackingEventsSubscriber } from ".";

export const LogTrackingEventsSubscriberLive = Layer.succeed(
	LogTrackingEventsSubscriber,
	{
		handle: (event) =>
			Effect.gen(function* () {
				yield* Effect.logInfo(
					`[Audit] ${event._tag} at ${event.occurredAt}`,
				);
			}),
	},
);
