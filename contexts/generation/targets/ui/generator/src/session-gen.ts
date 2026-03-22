/**
 * Session module generation.
 */

/**
 * Generate session.ts for authentication.
 */
export const generateSessionModule = (): string => `/**
 * Session management for UI server authentication.
 *
 * Sessions store the relationship between a session ID (stored in cookie)
 * and the authentication token (used to call the API).
 */

/**
 * Session data stored server-side.
 */
export interface Session {
	readonly id: string;
	/** Bearer token for API calls */
	readonly token: string;
	readonly userId: string;
	readonly userName: string | undefined;
	readonly expiresAt: number;
}

/**
 * Session store interface.
 */
export interface SessionStore {
	create(token: string, userId: string, userName?: string): Session;
	get(sessionId: string): Session | undefined;
	destroy(sessionId: string): void;
}

/**
 * Default session duration: 24 hours.
 */
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Create an in-memory session store.
 * Suitable for development and single-instance deployments.
 */
export const createInMemorySessionStore = (): SessionStore => {
	const sessions = new Map<string, Session>();

	return {
		create: (token, userId, userName) => {
			const session: Session = {
				expiresAt: Date.now() + SESSION_DURATION_MS,
				id: crypto.randomUUID(),
				token,
				userId,
				userName,
			};
			sessions.set(session.id, session);
			return session;
		},

		get: (id) => {
			const session = sessions.get(id);
			if (!session) return undefined;

			// Check expiration
			if (session.expiresAt <= Date.now()) {
				sessions.delete(id);
				return undefined;
			}

			return session;
		},

		destroy: (id) => {
			sessions.delete(id);
		},
	};
};
`;
