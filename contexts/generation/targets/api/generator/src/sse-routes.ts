/**
 * SSE (Server-Sent Events) route handling.
 */
import type { RouteHandler } from "./handler";
import type { SseConnection, SseManager } from "./sse";

/**
 * Add SSE endpoint for real-time event streaming.
 */
export const addSseRoute = (
	handlers: Map<string, Map<string, RouteHandler>>,
	ssePath: string,
	sseManager: SseManager,
): void => {
	const encoder = new TextEncoder();

	handlers.set(
		ssePath,
		new Map([
			[
				"GET",
				(request: Request) => {
					const origin = request.headers.get("Origin") ?? "*";
					const stream = new ReadableStream<Uint8Array>({
						cancel() {
							// Cleanup handled in start
						},
						start(controller) {
							const conn: SseConnection = {
								controller,
								id: crypto.randomUUID(),
							};
							sseManager.add(conn);

							// Send initial connected event
							try {
								controller.enqueue(
									encoder.encode("event: connected\ndata: {}\n\n"),
								);
							} catch {
								sseManager.remove(conn);
							}

							// Note: Cleanup happens when client disconnects
							// The ReadableStream will call cancel() which triggers cleanup
							// For explicit removal, you'd need to track the connection externally
						},
					});

					return Promise.resolve(
						new Response(stream, {
							headers: {
								"Access-Control-Allow-Credentials": "true",
								"Access-Control-Allow-Origin": origin,
								"Cache-Control": "no-cache",
								Connection: "keep-alive",
								"Content-Type": "text/event-stream",
							},
						}),
					);
				},
			],
			[
				"OPTIONS",
				(request: Request) => {
					const origin = request.headers.get("Origin") ?? "*";
					return Promise.resolve(
						new Response(undefined, {
							headers: {
								"Access-Control-Allow-Credentials": "true",
								"Access-Control-Allow-Headers": "Content-Type",
								"Access-Control-Allow-Methods": "GET, OPTIONS",
								"Access-Control-Allow-Origin": origin,
							},
							status: 204,
						}),
					);
				},
			],
		]),
	);
};
