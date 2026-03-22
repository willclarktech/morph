// Subscriber implementation for logCatalogEvents

import { Effect, Layer } from "effect";

import { LogCatalogEventsSubscriber } from ".";

export const LogCatalogEventsSubscriberLive = Layer.succeed(
	LogCatalogEventsSubscriber,
	{
		handle: (event) =>
			Effect.gen(function* () {
				yield* Effect.logInfo(
					`[Audit] ${event._tag} at ${event.occurredAt}`,
				);
			}),
	},
);
