/**
 * Auth route handler generation (login, logout, register).
 */
import type { AuthOperations } from "../auth/detection";

/**
 * Generate session management code.
 */
export const generateSessionCode = (envPrefix: string): string => `
import { createInMemorySessionStore } from "./session";

// Session management
const sessionStore = createInMemorySessionStore();

const getSessionId = (request: Request): string | undefined => {
	const cookies = request.headers.get("Cookie") ?? "";
	const match = /session_id=([^;]+)/.exec(cookies);
	return match?.[1];
};

const setSessionCookie = (sessionId: string): string =>
	\`session_id=\${sessionId}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400\`;

const clearSessionCookie = (): string =>
	"session_id=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0";

interface AuthState {
	readonly isAuthenticated: boolean;
	readonly userId: string | undefined;
	readonly userName: string | undefined;
	readonly token: string | undefined;
}

const getAuthState = (request: Request): AuthState => {
	const sessionId = getSessionId(request);
	if (!sessionId) return { isAuthenticated: false, userId: undefined, userName: undefined, token: undefined };
	const session = sessionStore.get(sessionId);
	if (!session) return { isAuthenticated: false, userId: undefined, userName: undefined, token: undefined };
	return {
		isAuthenticated: true,
		userId: session.userId,
		userName: session.userName,
		token: session.token,
	};
};

const createClientForRequest = (request: Request) => {
	const { token } = getAuthState(request);
	return createClient({
		baseUrl: process.env["${envPrefix}_API_URL"] ?? "http://localhost:3000",
		...(token === undefined ? {} : { token }),
	});
};
`;

/**
 * Generate login route code.
 */
const generateLoginRoute = (
	resolvedAuthOps: AuthOperations,
	envPrefix: string,
): string => {
	if (resolvedAuthOps.login) {
		return `
		// Login
		"/login": {
			GET: (request: Request) => {
				initLanguage(request);
				if (getAuthState(request).isAuthenticated) {
					return new Response(undefined, { status: 303, headers: { Location: "/" } });
				}
				return html(loginPage());
			},
			POST: async (request: Request) => {
				// eslint-disable-next-line @typescript-eslint/no-deprecated -- Bun.serve supports formData
				const formData = await request.formData();
				const email = formData.get("email") as string;
				const password = formData.get("password") as string;
				try {
					const loginClient = createClient({
						baseUrl: process.env["${envPrefix}_API_URL"] ?? "http://localhost:3000",
					});
					const result = await Effect.runPromise(loginClient.${resolvedAuthOps.login.name}({ email, password }));
					const token = (result as { token?: string }).token ?? (result as { id: string }).id;
					const session = sessionStore.create(
						token,
						(result as { id: string }).id,
						(result as { name?: string }).name,
					);
					return new Response(undefined, {
						status: 303,
						headers: {
							Location: "/",
							"Set-Cookie": setSessionCookie(session.id),
						},
					});
				} catch {
					return html(loginPage(t("error.invalidCredentials")));
				}
			},
		},`;
	}

	if (resolvedAuthOps.register) {
		return `
		// Login (uses /auth/login API endpoint via HTTP client)
		"/login": {
			GET: (request: Request) => {
				initLanguage(request);
				if (getAuthState(request).isAuthenticated) {
					return new Response(undefined, { status: 303, headers: { Location: "/" } });
				}
				return html(loginPage());
			},
			POST: async (request: Request) => {
				// eslint-disable-next-line @typescript-eslint/no-deprecated -- Bun.serve supports formData
				const formData = await request.formData();
				const email = formData.get("email") as string;
				const password = formData.get("password") as string;

				try {
					const loginClient = createClient({
						baseUrl: process.env["${envPrefix}_API_URL"] ?? "http://localhost:3000",
					});
					const result = await Effect.runPromise(loginClient.login({ email, password }));
					const token = (result as { token?: string }).token ?? (result as { id: string }).id;
					const session = sessionStore.create(
						token,
						(result as { id: string }).id,
						(result as { name?: string }).name,
					);
					return new Response(undefined, {
						status: 303,
						headers: {
							Location: "/",
							"Set-Cookie": setSessionCookie(session.id),
						},
					});
				} catch {
					return html(loginPage(t("error.invalidCredentials")));
				}
			},
		},`;
	}

	return "";
};

/**
 * Generate register route code.
 */
const generateRegisterRoute = (resolvedAuthOps: AuthOperations): string => {
	if (!resolvedAuthOps.register) {
		return "";
	}

	return `
		// Register
		"/register": {
			GET: (request: Request) => {
				initLanguage(request);
				if (getAuthState(request).isAuthenticated) {
					return new Response(undefined, { status: 303, headers: { Location: "/" } });
				}
				return html(registerPage());
			},
			POST: async (request: Request) => {
				// eslint-disable-next-line @typescript-eslint/no-deprecated -- Bun.serve supports formData
				const formData = await request.formData();
				const params = Object.fromEntries(formData) as Parameters<typeof client.${resolvedAuthOps.register.name}>[0];
				try {
					const result = await Effect.runPromise(client.${resolvedAuthOps.register.name}(params));
					// Auto-login after registration
					const token = (result as { token?: string }).token ?? (result as { id: string }).id;
					const session = sessionStore.create(
						token,
						(result as { id: string }).id,
						(result as { name?: string }).name,
					);
					return new Response(undefined, {
						status: 303,
						headers: {
							Location: "/",
							"Set-Cookie": setSessionCookie(session.id),
						},
					});
				} catch (error) {
					const message = error instanceof Error ? error.message : t("error.registrationFailed");
					return html(registerPage(message));
				}
			},
		},`;
};

/**
 * Generate all auth routes code.
 */
export const generateAuthRoutes = (
	resolvedAuthOps: AuthOperations,
	envPrefix: string,
): string => {
	const loginRoute = generateLoginRoute(resolvedAuthOps, envPrefix);
	const registerRoute = generateRegisterRoute(resolvedAuthOps);

	return `${loginRoute}
		// Logout
		"/logout": {
			GET: (request: Request) => {
				const sessionId = getSessionId(request);
				if (sessionId) sessionStore.destroy(sessionId);
				return new Response(undefined, {
					status: 303,
					headers: {
						Location: "/login",
						"Set-Cookie": clearSessionCookie(),
					},
				});
			},
		},${registerRoute}`;
};

/**
 * Get page imports needed for auth.
 */
export const getAuthPageImports = (
	resolvedAuthOps: AuthOperations,
): readonly string[] => {
	const imports: string[] = ["loginPage"];
	if (resolvedAuthOps.register) {
		imports.push("registerPage");
	}
	return imports;
};
