export interface LayerCompositionOptions {
	readonly hasEntities: boolean;
	readonly hasEvents: boolean;
	readonly hasSubscribers: boolean;
	readonly extraLayers?: readonly string[] | undefined;
	readonly authMerge?: string | undefined;
}

export const buildLayerComposition = (
	options: LayerCompositionOptions,
): string => {
	const { hasEntities, hasEvents, hasSubscribers, extraLayers, authMerge } =
		options;
	const extras =
		extraLayers && extraLayers.length > 0
			? extraLayers.map((l) => `\n\t\t${l},`).join("")
			: "";
	const authSuffix = authMerge ?? "";

	if (hasSubscribers) {
		return `const baseLayer = Layer.mergeAll(
		storageLayer,
		eventStoreLayer,
		EventEmitterInMemory,
		EventSubscriberRegistry,
		HandlersLayer.pipe(Layer.provide(Layer.merge(storageLayer, eventStoreLayer))),
		SubscribersLive,${extras}
	);
	const AppLayer = baseLayer.pipe(
		Layer.provideMerge(SubscriberBootstrap.pipe(Layer.provide(baseLayer))),
	)${authSuffix};`;
	}

	if (hasEvents) {
		return `const AppLayer = Layer.mergeAll(
		storageLayer,
		eventStoreLayer,
		EventEmitterInMemory,
		HandlersLayer.pipe(Layer.provide(Layer.merge(storageLayer, eventStoreLayer))),${extras}
	)${authSuffix};`;
	}

	if (hasEntities) {
		if (extras) {
			return `const AppLayer = Layer.mergeAll(
		HandlersLayer.pipe(Layer.provide(storageLayer)),${extras}
	)${authSuffix};`;
		}
		return `const AppLayer = HandlersLayer.pipe(Layer.provide(storageLayer))${authSuffix};`;
	}

	if (extras) {
		return `const AppLayer = Layer.mergeAll(
		HandlersLayer,${extras}
	)${authSuffix};`;
	}
	return `const AppLayer = HandlersLayer${authSuffix};`;
};
