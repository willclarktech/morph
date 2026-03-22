import { Effect } from "effect";

/**
 * SSE configuration for real-time event streaming.
 */
export interface SseConfig {
	/** Enable SSE endpoint (default: false) */
	readonly enabled?: boolean;
	/** Path for SSE endpoint (default: "/api/events") */
	readonly path?: string;
}

/**
 * SSE connection for tracking connected clients.
 */
export interface SseConnection {
	readonly controller: ReadableStreamDefaultController<Uint8Array>;
	readonly id: string;
}

/**
 * SSE connection manager for broadcasting events to clients.
 */
export interface SseManager {
	readonly add: (conn: SseConnection) => void;
	readonly broadcast: (eventType: string, data: string) => void;
	readonly remove: (conn: SseConnection) => void;
}

/**
 * Create an SSE connection manager.
 */
export const createSseManager = (): SseManager => {
	const connections = new Set<SseConnection>();
	const encoder = new TextEncoder();

	return {
		add: (conn) => {
			connections.add(conn);
		},
		broadcast: (eventType, data) => {
			const message = `event: ${eventType}\ndata: ${data}\n\n`;
			const encoded = encoder.encode(message);
			for (const conn of connections) {
				try {
					conn.controller.enqueue(encoded);
				} catch {
					// Connection closed, will be removed on next message
					connections.delete(conn);
				}
			}
		},
		remove: (conn) => {
			connections.delete(conn);
		},
	};
};

/**
 * Format a domain event as an activity log list item.
 * Used for broadcasting events to connected UI clients via SSE.
 *
 * @param eventTag - The event type tag (e.g., "TodoCreated", "PasteDeleted")
 * @param message - Human-readable message to display
 */
export const formatEventAsActivity = (
	eventTag: string,
	message?: string,
): string => {
	// Convert PascalCase event tag to human-readable message
	const defaultMessage = eventTag.replaceAll(/([A-Z])/g, " $1").trim();
	const displayMessage = message ?? defaultMessage;
	const timestamp = new Date().toLocaleTimeString();
	return `<li><small>${timestamp}</small> ${displayMessage}</li>`;
};

export const wireEventsToSse = (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- registry type varies per generated schema
	registry: Record<string, any>,
	eventNames: readonly string[],
	sseManager: SseManager,
): Effect.Effect<void> =>
	Effect.gen(function* () {
		for (const name of eventNames) {
			const subscribe = registry[`subscribeTo${name}`] as
				| ((
						handler: (event: { readonly _tag: string }) => Effect.Effect<void>,
				  ) => Effect.Effect<void>)
				| undefined;
			if (subscribe) {
				yield* subscribe((event) =>
					Effect.sync(() =>
						sseManager.broadcast("event", formatEventAsActivity(event._tag)),
					),
				);
			}
		}
	});
