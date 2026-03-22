// Subscriber implementation for logOrderEvents

import { Effect, Layer } from "effect";

import { LogOrderEventsSubscriber } from ".";

export const LogOrderEventsSubscriberLive = Layer.succeed(
	LogOrderEventsSubscriber,
	{
		handle: (event) =>
			Effect.gen(function* () {
				yield* Effect.logInfo(
					`[Audit] ${event._tag} at ${event.occurredAt}`,
				);
			}),
	},
);
