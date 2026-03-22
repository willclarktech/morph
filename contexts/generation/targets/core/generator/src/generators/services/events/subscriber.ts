/**
 * EventSubscriber service generators.
 */

import type {
	DomainSchema,
	GeneratedFile,
	SubscriberDef,
} from "@morph/domain-schema";

import { getCommandsWithEvents } from "@morph/domain-schema";
import { indent, toKebabCase, toPascalCase } from "@morph/utils";

/**
 * Generate the EventSubscriber service interface with typed subscribe methods.
 */
export const generateEventSubscriberService = (
	schema: DomainSchema,
	typesImportPath = "../schemas",
	projectName = "app",
): GeneratedFile => {
	const commandsWithEvents = getCommandsWithEvents(schema);

	// Collect all unique event names
	const allEventNames = [
		...new Set(
			commandsWithEvents.flatMap((op) => op.events.map((event) => event.name)),
		),
	];

	// Generate event type imports
	const eventTypeImports = allEventNames
		.map((name) => `${name}Event`)
		.join(", ");

	// Generate typed subscribe methods
	const subscribeMethods = indent(
		allEventNames
			.map(
				(eventName) =>
					`readonly subscribeTo${eventName}: (handler: (event: ${eventName}Event) => Effect.Effect<void>) => Effect.Effect<void>;`,
			)
			.join("\n"),
		1,
	);

	const content = `// Generated EventSubscriber service interface
// Do not edit - regenerate from schema

import { Context, Effect } from "effect";

import type { DomainEvent, ${eventTypeImports} } from "${typesImportPath}";

/**
 * Service for subscribing to and publishing domain events.
 * Uses typed subscribe methods for compile-time safety.
 */
export interface EventSubscriber {
${subscribeMethods}
	readonly publish: (event: DomainEvent) => Effect.Effect<void>;
}

/**
 * Context tag for EventSubscriber dependency injection.
 */
export const EventSubscriber = Context.GenericTag<EventSubscriber>("@${projectName}/EventSubscriber");
`;

	return { content, filename: "services/event-subscriber.ts" };
};

/**
 * Generate the EventSubscriber registry implementation with typed subscribe methods.
 */
export const generateEventSubscriberRegistry = (
	schema: DomainSchema,
	typesImportPath = "../schemas",
): GeneratedFile => {
	const commandsWithEvents = getCommandsWithEvents(schema);

	// Collect all unique event names
	const allEventNames = [
		...new Set(
			commandsWithEvents.flatMap((op) => op.events.map((event) => event.name)),
		),
	];

	// Generate typed subscribe method implementations
	const subscribeImpls = indent(
		allEventNames
			.map(
				(eventName) =>
					`subscribeTo${eventName}: (handler) =>
	Ref.update(handlers, (map) => ({
		...map,
		["${eventName}"]: [...(map["${eventName}"] ?? []), handler as EventHandler],
	})),`,
			)
			.join("\n\n"),
		3,
	);

	const content = `// Generated EventSubscriber registry implementation
// Do not edit - regenerate from schema

import { Effect, Layer, Ref } from "effect";

import type { DomainEvent } from "${typesImportPath}";

import { EventSubscriber } from "./event-subscriber";

/**
 * Internal handler type for storage.
 */
type EventHandler = (event: DomainEvent) => Effect.Effect<void>;

/**
 * Registry-based EventSubscriber implementation.
 * Stores handlers by event tag and publishes to all matching handlers.
 * Uses fire-and-forget semantics - errors are logged but don't fail the publisher.
 */
export const EventSubscriberRegistry: Layer.Layer<EventSubscriber> = Layer.effect(
	EventSubscriber,
	Effect.gen(function* () {
		const handlers = yield* Ref.make<Record<string, readonly EventHandler[]>>({});

		return {
${subscribeImpls}

			publish: (event) =>
				Effect.gen(function* () {
					const map = yield* Ref.get(handlers);
					const eventHandlers = map[event._tag] ?? [];

					// Fire-and-forget: run all handlers, log errors
					yield* Effect.forEach(
						eventHandlers,
						(handler) =>
							handler(event).pipe(
								Effect.catchAll((error) =>
									Effect.logError(\`Subscriber error for \${event._tag}\`, { error }),
								),
							),
						{ concurrency: "unbounded", discard: true },
					);
				}),
		};
	}),
);
`;

	return { content, filename: "services/event-subscriber-registry.ts" };
};

/**
 * Generate subscriber bootstrap that wires subscribers to the registry.
 */
export const generateSubscriberBootstrap = (
	subscribers: readonly {
		readonly def: SubscriberDef;
		readonly name: string;
	}[],
): GeneratedFile => {
	// Generate imports for each subscriber
	const subscriberImports = subscribers
		.map((s) => {
			const pascalName = toPascalCase(s.name);
			const kebabName = toKebabCase(s.name);
			return `import { ${pascalName}Subscriber } from "../subscribers/${kebabName}";`;
		})
		.join("\n");

	// Generate wiring for each subscriber using typed subscribe methods
	const wiringCode = indent(
		subscribers
			.map((s) => {
				const pascalName = toPascalCase(s.name);
				const variableName = `${pascalName.charAt(0).toLowerCase()}${pascalName.slice(1)}`;
				return [
					`const ${variableName} = yield* ${pascalName}Subscriber;`,
					...s.def.events.map(
						(event) =>
							`yield* registry.subscribeTo${event}(${variableName}.handle);`,
					),
				].join("\n");
			})
			.join("\n\n"),
		2,
	);

	const content = `// Generated subscriber bootstrap
// Wires subscribers to the event registry at startup
// Do not edit - regenerate from schema

import { Effect, Layer } from "effect";

import { EventSubscriber } from "./event-subscriber";
${subscriberImports}

/**
 * Bootstrap layer that registers all subscribers with the event registry.
 * Include this in your AppLayer to enable event subscriptions.
 */
export const SubscriberBootstrap = Layer.effectDiscard(
	Effect.gen(function* () {
		const registry = yield* EventSubscriber;

${wiringCode}
		yield* Effect.logDebug("Subscribers registered");
	}),
);
`;

	return { content, filename: "services/subscriber-bootstrap.ts" };
};
