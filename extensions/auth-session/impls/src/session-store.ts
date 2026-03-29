import type { Session } from "@morphdsl/auth-session-dsl";

import {
	SessionExpiredError,
	SessionNotFoundError,
	SessionStorageError,
} from "@morphdsl/auth-session-dsl";
import { jsonParse, jsonStringify } from "@morphdsl/utils";
/**
 * Session storage with pluggable strategies.
 *
 * Default: In-memory session store (suitable for development/testing).
 * For production, use setSessionStore() to configure a persistent backend.
 */
import { Effect } from "effect";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";

/**
 * Session store interface - pluggable storage backend.
 */
export interface SessionStore {
	readonly get: (
		sessionId: string,
	) => Effect.Effect<Session | undefined, SessionStorageError>;
	readonly set: (session: Session) => Effect.Effect<void, SessionStorageError>;
	readonly delete: (
		sessionId: string,
	) => Effect.Effect<void, SessionStorageError>;
}

/**
 * In-memory session store. Fast but not persistent.
 */
const createInMemorySessionStore = (): SessionStore => {
	const sessions = new Map<string, Session>();

	return {
		get: (sessionId) => Effect.sync(() => sessions.get(sessionId)),
		set: (session) =>
			Effect.sync(() => {
				sessions.set(session.id, session);
			}),
		delete: (sessionId) =>
			Effect.sync(() => {
				sessions.delete(sessionId);
			}),
	};
};

/**
 * File-based session store. Sessions stored as individual JSON files.
 */
export const createFileSessionStore = (sessionDir: string): SessionStore => {
	const getSessionPath = (sessionId: string): string =>
		path.join(sessionDir, `${sessionId}.json`);

	return {
		get: (sessionId) =>
			Effect.try({
				catch: (error) =>
					new SessionStorageError({
						message: `Failed to read session: ${String(error)}`,
					}),
				try: () => {
					const sessionPath = getSessionPath(sessionId);
					if (!existsSync(sessionPath)) {
						return undefined;
					}
					const content = readFileSync(sessionPath, "utf8");
					return jsonParse(content) as Session;
				},
			}),
		set: (session) =>
			Effect.try({
				catch: (error) =>
					new SessionStorageError({
						message: `Failed to write session: ${String(error)}`,
					}),
				try: () => {
					mkdirSync(sessionDir, { recursive: true });
					const sessionPath = getSessionPath(session.id);
					writeFileSync(sessionPath, jsonStringify(session));
				},
			}),
		delete: (sessionId) =>
			Effect.try({
				catch: (error) =>
					new SessionStorageError({
						message: `Failed to delete session: ${String(error)}`,
					}),
				try: () => {
					const sessionPath = getSessionPath(sessionId);
					rmSync(sessionPath, { force: true });
				},
			}),
	};
};

// Default session store (in-memory)
let currentStore: SessionStore = createInMemorySessionStore();

/**
 * Set the session store to use for all operations.
 * Call this at startup to configure persistent storage.
 */
export const setSessionStore = (store: SessionStore): void => {
	currentStore = store;
};

/**
 * Reset to default in-memory store (useful for testing).
 */
export const resetSessionStore = (): void => {
	currentStore = createInMemorySessionStore();
};

/**
 * Check if a session has expired.
 */
export const isSessionExpired = (session: Session): boolean => {
	if (session.expiresAt === undefined) {
		return false;
	}
	return new Date(session.expiresAt) < new Date();
};

/**
 * Generate a unique session ID.
 */
export const generateSessionId = (): string => {
	return crypto.randomUUID();
};

const DEFAULT_EXPIRY_SECONDS = 86_400; // 24 hours

/**
 * Create a new session for a user.
 */
export const createSession = (
	userId: string,
	data?: unknown,
	expiresInSeconds?: number,
): Effect.Effect<Session, SessionStorageError> =>
	Effect.gen(function* () {
		const now = new Date();
		const expiry = expiresInSeconds ?? DEFAULT_EXPIRY_SECONDS;
		const expiresAt = new Date(now.getTime() + expiry * 1000).toISOString();

		const session: Session = {
			id: generateSessionId(),
			userId,
			createdAt: now.toISOString(),
			expiresAt,
			data,
		};

		yield* currentStore.set(session);
		return session;
	});

/**
 * Validate a session exists and is not expired.
 */
export const validateSession = (
	sessionId: string,
): Effect.Effect<
	Session,
	SessionNotFoundError | SessionExpiredError | SessionStorageError
> =>
	Effect.gen(function* () {
		const session = yield* currentStore.get(sessionId);

		if (session === undefined) {
			return yield* Effect.fail(new SessionNotFoundError({ sessionId }));
		}

		if (isSessionExpired(session)) {
			yield* currentStore.delete(sessionId);
			return yield* Effect.fail(new SessionExpiredError({ sessionId }));
		}

		return session;
	});

/**
 * Destroy a session.
 */
export const destroySession = (
	sessionId: string,
): Effect.Effect<void, SessionStorageError> => currentStore.delete(sessionId);
