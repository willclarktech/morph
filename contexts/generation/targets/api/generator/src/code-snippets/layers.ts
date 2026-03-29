import { buildLayerComposition } from "@morphdsl/utils";

import type { DetectedFeatures } from "../feature-detection";

export const buildLayerSetup = (features: DetectedFeatures): string =>
	buildLayerComposition({
		hasEntities: features.hasEntities,
		hasEvents: features.hasEvents,
		hasSubscribers: features.hasSubscribers,
	});

/**
 * Build event store setup code.
 */
export const buildEventStoreSetup = (
	features: DetectedFeatures,
	envPrefix: string,
): string => {
	if (!features.hasEvents) return "";

	return `
	const eventStoreLayer = yield* resolveEventStore({ envPrefix: "${envPrefix}" });
`;
};

/**
 * Build storage layer setup code.
 * When events are present, pipes Effect.provide(eventStoreLayer) to share
 * the EventStoreTransport with eventsourced storage backends.
 */
export const buildStorageLayerSetup = (
	features: DetectedFeatures,
	envPrefix: string,
): string => {
	if (!features.hasEntities) return "";

	if (features.hasEvents) {
		return `const storageLayer = yield* resolveStorage({ envPrefix: "${envPrefix}" }).pipe(Effect.provide(eventStoreLayer));
`;
	}

	return `const storageLayer = yield* resolveStorage({ envPrefix: "${envPrefix}" });
`;
};
