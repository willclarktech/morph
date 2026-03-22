/**
 * Server Lifecycle Management
 *
 * Handles spawning, health checking, and stopping the API server
 * for integration testing.
 */
import type { Subprocess } from "bun";

/**
 * Configuration for server management.
 */
export interface ServerConfig {
	/** Command to start the server (e.g., "bun src/index.ts") */
	readonly command: string;
	/** Working directory for the server process */
	readonly cwd: string;
	/** Environment variables to pass to the server process */
	readonly env?: Record<string, string>;
	/** Health check path (default: /api/health) */
	readonly healthPath?: string;
	/** Port to run on (0 = random available port) */
	readonly port?: number;
	/** Maximum time to wait for server startup (ms) */
	readonly startupTimeout?: number;
}

/**
 * Running server instance.
 */
export interface ServerInstance {
	/** Base URL for requests (e.g., http://localhost:3000) */
	readonly baseUrl: string;
	/** The actual port the server is listening on */
	readonly port: number;
	/** Stop the server */
	readonly stop: () => void;
}

const DEFAULT_STARTUP_TIMEOUT = 10_000;
const HEALTH_CHECK_INTERVAL = 100;

/**
 * Find an available port by starting a temporary server.
 */
const findAvailablePort = async (): Promise<number> => {
	const server = Bun.serve({
		fetch: () => new Response(""),
		port: 0,
	});
	const port = server.port ?? 0;
	await server.stop(true);
	if (port === 0) {
		throw new Error("Failed to allocate a random port");
	}
	return port;
};

/**
 * Wait for server to be healthy.
 */
const waitForHealth = async (
	baseUrl: string,
	healthPath: string,
	timeout: number,
): Promise<boolean> => {
	const deadline = Date.now() + timeout;
	const url = `${baseUrl}${healthPath}`;

	while (Date.now() < deadline) {
		try {
			const response = await fetch(url);
			if (response.ok) {
				return true;
			}
		} catch {
			// Server not ready yet
		}
		await Bun.sleep(HEALTH_CHECK_INTERVAL);
	}

	return false;
};

/**
 * Start the API server and wait for it to be healthy.
 */
export const startServer = async (
	config: ServerConfig,
): Promise<ServerInstance> => {
	const port =
		config.port === 0 ? await findAvailablePort() : (config.port ?? 3000);
	const healthPath = config.healthPath ?? "/api/health";
	const timeout = config.startupTimeout ?? DEFAULT_STARTUP_TIMEOUT;
	const baseUrl = `http://localhost:${String(port)}`;

	// Parse command into parts
	const parts = config.command.split(" ");
	const [cmdRaw, ...args] = parts;
	let cmd = cmdRaw;

	if (!cmd) {
		throw new Error("Server command is empty");
	}

	// Resolve "bun" to full path (subprocess may not have PATH set correctly)
	if (cmd === "bun") {
		const bunPath = Bun.which("bun");
		if (bunPath) {
			cmd = bunPath;
		}
	}

	// Start server process
	const process_: Subprocess = Bun.spawn([cmd, ...args], {
		cwd: config.cwd,
		env: {
			...Bun.env,
			...config.env,
			PORT: String(port),
		},
		stderr: "inherit",
		stdout: "inherit",
	});

	// Wait for health check
	const healthy = await waitForHealth(baseUrl, healthPath, timeout);

	if (!healthy) {
		process_.kill();
		throw new Error(
			`Server failed to start within ${String(timeout)}ms. Check that ${healthPath} returns 200.`,
		);
	}

	return {
		baseUrl,
		port,
		stop: () => {
			process_.kill();
		},
	};
};
