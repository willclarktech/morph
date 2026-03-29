import { buildLayerComposition } from "@morphdsl/utils";

const toPascalCase = (name: string): string =>
	name
		.split(/[-_]/)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");

export const buildLayerSetup = (options: {
	readonly hasEntities: boolean;
	readonly hasEvents: boolean;
	readonly hasSubscribers: boolean;
}): string =>
	buildLayerComposition({
		extraLayers: ["StderrLogger"],
		hasEntities: options.hasEntities,
		hasEvents: options.hasEvents,
		hasSubscribers: options.hasSubscribers,
	});

/**
 * Build storage setup code. For multi-context, resolves storage from each
 * context and merges the resulting layers.
 * When events are present, pipes Effect.provide(eventStoreLayer) to share
 * the EventStoreTransport with eventsourced storage backends.
 */
export const buildStorageSetup = (
	envPrefix: string,
	hasEvents: boolean,
	contextNames?: readonly string[],
): string => {
	const provideSuffix = hasEvents
		? ".pipe(Effect.provide(eventStoreLayer))"
		: "";

	if (!contextNames || contextNames.length <= 1) {
		return `const storageLayer = yield* resolveStorage({ envPrefix: "${envPrefix}" })${provideSuffix};\n`;
	}
	const lines = contextNames.map((context) => {
		const pascal = toPascalCase(context);
		return `\tconst ${context}Storage = yield* resolve${pascal}Storage({ envPrefix: "${envPrefix}" })${provideSuffix};`;
	});
	const mergeArguments = contextNames
		.map((context) => `${context}Storage`)
		.join(", ");
	return `${lines.join("\n")}\n\tconst storageLayer = Layer.mergeAll(${mergeArguments});\n`;
};

/**
 * Build event store setup code.
 */
export const buildEventStoreSetup = (envPrefix: string): string => `
	const eventStoreLayer = yield* resolveEventStore({ envPrefix: "${envPrefix}" });
`;
