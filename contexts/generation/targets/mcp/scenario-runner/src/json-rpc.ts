/**
 * JSON-RPC request structure.
 */
export interface JsonRpcRequest {
	readonly jsonrpc: "2.0";
	readonly id: number;
	readonly method: string;
	readonly params?: unknown;
}

/**
 * JSON-RPC response structure.
 */
export interface JsonRpcResponse {
	readonly jsonrpc: "2.0";
	readonly id: number;
	readonly result?: unknown;
	readonly error?: {
		readonly code: number;
		readonly data?: unknown;
		readonly message: string;
	};
}

/**
 * MCP tool call result.
 */
export interface ToolResult {
	readonly content: readonly {
		readonly text: string;
		readonly type: string;
	}[];
	readonly isError?: boolean;
}

export interface JsonRpcConnection {
	readonly sendRequest: (
		method: string,
		params?: unknown,
	) => Promise<JsonRpcResponse>;
	readonly stop: () => void;
}

interface JsonRpcTransport {
	readonly stdin: { write(data: string): unknown };
	readonly stdout: ReadableStream<Uint8Array>;
	readonly kill: () => void;
}

/**
 * Create a JSON-RPC connection over subprocess stdin/stdout.
 */
export const createJsonRpcConnection = (
	transport: JsonRpcTransport,
	timeout: number,
): JsonRpcConnection => {
	let nextId = 1;
	let responseBuffer = "";

	const reader = transport.stdout.getReader();
	const pendingResponses = new Map<
		number,
		{
			reject: (error: Error) => void;
			resolve: (value: JsonRpcResponse) => void;
		}
	>();

	// Background reader that processes JSON-RPC responses
	const readLoop = async (): Promise<void> => {
		try {
			let reading = true;
			while (reading) {
				const result = await reader.read();
				if (result.done) {
					reading = false;
					continue;
				}

				responseBuffer += new TextDecoder().decode(result.value);

				// Try to parse complete JSON-RPC messages (newline-delimited)
				const lines = responseBuffer.split("\n");
				responseBuffer = lines.pop() ?? "";

				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed) continue;

					try {
						const response = JSON.parse(trimmed) as JsonRpcResponse;
						const pending = pendingResponses.get(response.id);
						if (pending) {
							pendingResponses.delete(response.id);
							pending.resolve(response);
						}
					} catch {
						// Ignore malformed JSON
					}
				}
			}
		} catch {
			// Reader closed
		}
	};

	void readLoop();

	const sendRequest = async (
		method: string,
		params?: unknown,
	): Promise<JsonRpcResponse> => {
		const id = nextId++;
		const request: JsonRpcRequest = {
			id,
			jsonrpc: "2.0",
			method,
			...(params === undefined ? {} : { params }),
		};

		return new Promise((resolve, reject) => {
			pendingResponses.set(id, { reject, resolve });

			const requestJson = JSON.stringify(request) + "\n";
			void transport.stdin.write(requestJson);

			setTimeout(() => {
				if (pendingResponses.has(id)) {
					pendingResponses.delete(id);
					reject(new Error(`MCP request timed out: ${method}`));
				}
			}, timeout);
		});
	};

	return {
		sendRequest,
		stop: () => {
			void reader.cancel();
			transport.kill();
		},
	};
};
