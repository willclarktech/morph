import { describe, expect, test } from "bun:test";

import { buildLayerComposition } from "./layer-composition";

describe("buildLayerComposition", () => {
	test("minimal: no entities, no events, no subscribers", () => {
		const result = buildLayerComposition({
			hasEntities: false,
			hasEvents: false,
			hasSubscribers: false,
		});
		expect(result).toBe("const AppLayer = HandlersLayer;");
	});

	test("minimal with authMerge", () => {
		const result = buildLayerComposition({
			hasEntities: false,
			hasEvents: false,
			hasSubscribers: false,
			authMerge: ".pipe(Layer.provideMerge(AuthLayer))",
		});
		expect(result).toContain(
			"HandlersLayer.pipe(Layer.provideMerge(AuthLayer))",
		);
	});

	test("minimal with extraLayers", () => {
		const result = buildLayerComposition({
			hasEntities: false,
			hasEvents: false,
			hasSubscribers: false,
			extraLayers: ["CustomLayer"],
		});
		expect(result).toContain("Layer.mergeAll(");
		expect(result).toContain("HandlersLayer,");
		expect(result).toContain("CustomLayer,");
	});

	test("entities only", () => {
		const result = buildLayerComposition({
			hasEntities: true,
			hasEvents: false,
			hasSubscribers: false,
		});
		expect(result).toContain("HandlersLayer.pipe(Layer.provide(storageLayer))");
		expect(result).not.toContain("Layer.mergeAll");
	});

	test("entities with extraLayers", () => {
		const result = buildLayerComposition({
			hasEntities: true,
			hasEvents: false,
			hasSubscribers: false,
			extraLayers: ["ExtraLayer"],
		});
		expect(result).toContain("Layer.mergeAll(");
		expect(result).toContain(
			"HandlersLayer.pipe(Layer.provide(storageLayer)),",
		);
		expect(result).toContain("ExtraLayer,");
	});

	test("events (includes entities implicitly)", () => {
		const result = buildLayerComposition({
			hasEntities: true,
			hasEvents: true,
			hasSubscribers: false,
		});
		expect(result).toContain("storageLayer,");
		expect(result).toContain("eventStoreLayer,");
		expect(result).toContain("EventEmitterInMemory,");
		expect(result).toContain(
			"HandlersLayer.pipe(Layer.provide(Layer.merge(storageLayer, eventStoreLayer))),",
		);
		expect(result).not.toContain("SubscribersLive");
	});

	test("events with extraLayers", () => {
		const result = buildLayerComposition({
			hasEntities: true,
			hasEvents: true,
			hasSubscribers: false,
			extraLayers: ["PortLayer"],
		});
		expect(result).toContain("PortLayer,");
		expect(result).toContain("eventStoreLayer,");
	});

	test("subscribers (includes events and entities)", () => {
		const result = buildLayerComposition({
			hasEntities: true,
			hasEvents: true,
			hasSubscribers: true,
		});
		expect(result).toContain("const baseLayer = Layer.mergeAll(");
		expect(result).toContain("EventSubscriberRegistry,");
		expect(result).toContain("SubscribersLive,");
		expect(result).toContain("SubscriberBootstrap");
		expect(result).toContain("Layer.provideMerge(");
	});

	test("subscribers with extraLayers", () => {
		const result = buildLayerComposition({
			hasEntities: true,
			hasEvents: true,
			hasSubscribers: true,
			extraLayers: ["NotifyLayer"],
		});
		expect(result).toContain("NotifyLayer,");
		expect(result).toContain("baseLayer");
	});

	test("subscribers with authMerge", () => {
		const result = buildLayerComposition({
			hasEntities: true,
			hasEvents: true,
			hasSubscribers: true,
			authMerge: ".pipe(Layer.provideMerge(AuthLive))",
		});
		expect(result).toContain(".pipe(Layer.provideMerge(AuthLive))");
	});

	test("all features combined", () => {
		const result = buildLayerComposition({
			hasEntities: true,
			hasEvents: true,
			hasSubscribers: true,
			extraLayers: ["PortA", "PortB"],
			authMerge: ".pipe(Layer.provideMerge(AuthLive))",
		});
		expect(result).toContain("PortA,");
		expect(result).toContain("PortB,");
		expect(result).toContain("SubscriberBootstrap");
		expect(result).toContain("AuthLive");
	});

	test("empty extraLayers array treated as no extras", () => {
		const result = buildLayerComposition({
			hasEntities: false,
			hasEvents: false,
			hasSubscribers: false,
			extraLayers: [],
		});
		expect(result).toBe("const AppLayer = HandlersLayer;");
	});
});
