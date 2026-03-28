/**
 * EventEmitter service generators.
 */

import type { GeneratedFile } from "@morph/domain-schema";

/**
 * Generate the EventEmitter service interface.
 */
export const generateEventEmitterService = (
	typesImportPath = "../schemas",
	projectName = "app",
): GeneratedFile => {
	const content = `// Generated EventEmitter service interface
// Do not edit - regenerate from schema

import type { Effect } from "effect";

import { Context } from "effect";

import type { DomainEvent } from "${typesImportPath}";

/**
 * Service for emitting domain events.
 */
export interface EventEmitter {
	readonly emit: (event: DomainEvent) => Effect.Effect<void>;
}

/**
 * Context tag for EventEmitter dependency injection.
 */
export const EventEmitter = Context.GenericTag<EventEmitter>("@${projectName}/EventEmitter");
`;

	return { content, filename: "services/event-emitter.ts" };
};

/**
 * Generate the InMemory EventEmitter implementation.
 */
export const generateEventEmitterInMemory = (
	typesImportPath = "../schemas",
): GeneratedFile => {
	const content = `// Generated InMemory EventEmitter implementation
// Do not edit - regenerate from schema

import { Effect, Layer, Ref } from "effect";

import type { DomainEvent } from "${typesImportPath}";

import { EventEmitter } from "./event-emitter";

/**
 * InMemory implementation of EventEmitter for testing.
 * Collects events in a Ref for later inspection.
 */
export const EventEmitterInMemory: Layer.Layer<EventEmitter> = Layer.effect(
	EventEmitter,
	Effect.gen(function* () {
		const events = yield* Ref.make<readonly DomainEvent[]>([]);

		return {
			emit: (event) => Ref.update(events, (list) => [...list, event]),
		};
	}),
);

/**
 * Create a test event collector with direct access to emitted events.
 */
export const makeEventCollector = () => {
	const events: DomainEvent[] = [];
	return {
		layer: Layer.succeed(EventEmitter, {
			emit: (event) => Effect.sync(() => { events.push(event); }),
		}),
		getEvents: () => events,
	};
};
`;

	return { content, filename: "services/event-emitter-inmemory.ts" };
};
