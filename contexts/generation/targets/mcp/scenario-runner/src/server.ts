import type { ToolResult } from "./json-rpc";
/**
 * MCP server management via stdio JSON-RPC.
 */
import type { McpRunnerConfig } from "./runner";

import { createJsonRpcConnection } from "./json-rpc";

/**
 * Running MCP server instance.
 */
export interface McpInstance {
	/** Call an MCP tool with optional auth user */
	readonly callTool: (
		name: string,
		args: Record<string, unknown>,
		authUser?: Record<string, unknown>,
	) => Promise<unknown>;
	/** Stop the MCP server */
	readonly stop: () => void;
	/** Available tool names from the MCP server */
	readonly toolNames: readonly string[];
}

const DEFAULT_STARTUP_TIMEOUT = 10_000;

/**
 * Start an MCP server process and return a communication interface.
 */
export const startMcpServer = async (
	config: McpRunnerConfig,
): Promise<McpInstance> => {
	const timeout = config.startupTimeout ?? DEFAULT_STARTUP_TIMEOUT;

	// Parse command into parts
	const parts = config.command.split(" ");
	// eslint-disable-next-line prefer-const -- cmd may be reassigned for bun path resolution
	let [cmd, ...args] = parts;

	if (!cmd) {
		throw new Error("MCP command is empty");
	}

	// Resolve "bun" to full path (subprocess may not have PATH set correctly)
	if (cmd === "bun") {
		const bunPath = Bun.which("bun");
		if (bunPath) {
			cmd = bunPath;
		}
	}

	// Start MCP server process with pipe for stdin/stdout
	const subprocess = Bun.spawn([cmd, ...args], {
		cwd: config.cwd,
		env: {
			...Bun.env,
			...config.env,
		},
		stdin: "pipe",
		stdout: "pipe",
		stderr: "inherit",
	});

	const stdin = subprocess.stdin;
	const stdout = subprocess.stdout;

	const connection = createJsonRpcConnection(
		{ kill: () => subprocess.kill(), stdin, stdout },
		timeout,
	);

	// Initialize the MCP server
	const initResponse = await connection.sendRequest("initialize", {
		capabilities: {},
		clientInfo: { name: "morph-test-runner", version: "1.0.0" },
		protocolVersion: "2024-11-05",
	});

	if (initResponse.error) {
		subprocess.kill();
		throw new Error(`MCP initialization failed: ${initResponse.error.message}`);
	}

	// Notify that initialization is complete
	await connection.sendRequest("notifications/initialized");

	// Discover available tool names for operation resolution
	const toolsResponse = await connection.sendRequest("tools/list");
	const toolNames: string[] = [];
	if (!toolsResponse.error && toolsResponse.result) {
		const tools =
			(toolsResponse.result as { tools?: readonly { name: string }[] }).tools ??
			[];
		for (const tool of tools) {
			toolNames.push(tool.name);
		}
	}

	return {
		callTool: async (
			name: string,
			toolArguments: Record<string, unknown>,
			authUser?: Record<string, unknown>,
		): Promise<unknown> => {
			// Pass auth user via _meta.authInfo.extra.user for MCP auth strategies
			const requestArguments = authUser
				? {
						...toolArguments,
						_meta: { authInfo: { extra: { user: authUser } } },
					}
				: toolArguments;

			const response = await connection.sendRequest("tools/call", {
				arguments: requestArguments,
				name,
			});

			if (response.error) {
				throw new Error(`MCP tool call failed: ${response.error.message}`);
			}

			const result = response.result as ToolResult;

			if (result.isError) {
				const errorContent = result.content[0]?.text;
				if (errorContent) {
					try {
						const errorData = JSON.parse(errorContent) as {
							_tag?: string;
							message?: string;
						};
						throw new Error(
							errorData.message ?? errorData._tag ?? "Tool error",
						);
					} catch (error) {
						if (error instanceof SyntaxError) {
							throw new Error(errorContent);
						}
						throw error;
					}
				}
				throw new Error("Tool returned an error");
			}

			// Parse the result from content
			const content = result.content[0]?.text;
			if (content) {
				try {
					return JSON.parse(content);
				} catch {
					return content;
				}
			}

			return undefined;
		},
		stop: () => {
			connection.stop();
		},
		toolNames,
	};
};
