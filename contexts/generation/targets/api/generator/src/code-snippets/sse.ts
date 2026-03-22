import type { DetectedFeatures } from "../feature-detection";

/**
 * Build SSE setup code.
 */
export const buildSseSetup = (features: DetectedFeatures): string => {
	if (!features.hasEvents) return "";

	return `
	// Create SSE manager for real-time event streaming
	const sseManager = createSseManager();
`;
};

/**
 * Build SSE runtime setup (only if not already created by password auth).
 */
export const buildSseRuntimeSetup = (features: DetectedFeatures): string => {
	if (!features.hasSseWiring || features.hasPasswordAuth) return "";

	return `
	// Create runtime for event wiring
	const appRuntime = ManagedRuntime.make(AppLayer);
`;
};

/**
 * Build SSE event wiring code.
 */
export const buildSseEventWiring = (features: DetectedFeatures): string => {
	if (!features.hasSseWiring) return "";

	const eventNamesArray = `[${features.eventNames.map((n) => `"${n}"`).join(", ")}]`;

	return `
	// Wire domain events to SSE broadcaster
	yield* Effect.promise(() =>
		appRuntime.runPromise(
			Effect.gen(function* () {
				const registry = yield* EventSubscriber;
				yield* wireEventsToSse(registry, ${eventNamesArray}, sseManager);
			}),
		),
	);
`;
};
