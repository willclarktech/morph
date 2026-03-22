import { buildLayerComposition } from "@morph/utils";

const generateStderrLoggerCode =
	(): string => `// Use stderr logger to keep stdout clean for JSON output
	const stderrLogger = Logger.replace(
		Logger.defaultLogger,
		Logger.make(({ message }) => {
			const text =
				typeof message === "string" ? message : JSON.stringify(message);
			console.error(text);
		}),
	);`;

export const generateAppLayerCode = (options: {
	readonly hasAuth: boolean;
	readonly hasEntities: boolean;
	readonly hasEvents: boolean;
	readonly hasSubscribers: boolean;
}): string => {
	const stderrLoggerCode = generateStderrLoggerCode();
	const layerCode = buildLayerComposition({
		authMerge: options.hasAuth
			? `.pipe(Layer.provideMerge(AuthLayer))`
			: undefined,
		extraLayers: ["stderrLogger"],
		hasEntities: options.hasEntities,
		hasEvents: options.hasEvents,
		hasSubscribers: options.hasSubscribers,
	});

	return `${stderrLoggerCode}

	${layerCode}`;
};

const toPascalCase = (name: string): string =>
	name
		.split(/[-_]/)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");

/**
 * Generate storage layer code in main.
 * For multi-context, resolves storage from each context and merges.
 * When events are present, pipes Effect.provide(eventStoreLayer) to share
 * the EventStoreTransport with eventsourced storage backends.
 */
export const generateStorageLayerCode = (
	envPrefix: string,
	hasEvents: boolean,
	contextNames?: readonly string[],
): string => {
	const provideSuffix = hasEvents
		? ".pipe(Effect.provide(eventStoreLayer))"
		: "";

	if (!contextNames || contextNames.length <= 1) {
		return `const storageLayer = yield* resolveStorage({ envPrefix: "${envPrefix}", backendName: parseBackendArg(process.argv.slice(2), "--storage", "${envPrefix}_STORAGE") })${provideSuffix};\n`;
	}
	const lines = contextNames.map((ctx) => {
		const pascal = toPascalCase(ctx);
		return `\tconst ${ctx}Storage = yield* resolve${pascal}Storage({ envPrefix: "${envPrefix}", backendName: parseBackendArg(process.argv.slice(2), "--storage", "${envPrefix}_STORAGE") })${provideSuffix};`;
	});
	const mergeArgs = contextNames.map((ctx) => `${ctx}Storage`).join(", ");
	return `${lines.join("\n")}\n\tconst storageLayer = Layer.mergeAll(${mergeArgs});\n`;
};

/**
 * Generate event store layer code in main.
 */
export const generateEventStoreLayerCode = (envPrefix: string): string =>
	`const eventStoreLayer = yield* resolveEventStore({ envPrefix: "${envPrefix}", backendName: parseBackendArg(process.argv.slice(2), "--event-store", "${envPrefix}_EVENT_STORE") });
`;
