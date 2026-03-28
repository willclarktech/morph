# UI Authentication

This document describes how the UI generator handles authentication for generated HTMX web applications.

## Architecture

The UI uses **session-based authentication** where the UI server owns sessions and the API remains stateless:

```
┌─────────────┐    session_id cookie    ┌─────────────┐   Bearer token   ┌─────────────┐
│   Browser   │ ◄─────────────────────► │  UI Server  │ ◄──────────────► │  API Server │
└─────────────┘                         └─────────────┘                  └─────────────┘
                                              │
                                              ▼
                                        Session Store
                                        (in-memory)
```

**Why this pattern:**

- API stays stateless (12-factor app, horizontal scaling)
- Session revocation without token blacklists
- Cookie contains session ID, not token (more secure, smaller)
- Natural for SSR apps (like HTMX)

## Session Flow

1. **Registration**: User submits registration form → UI calls API's `createUser` → API returns user with ID → UI creates session with user ID as token → Sets `session_id` cookie → Redirects to home

2. **Subsequent requests**: UI reads `session_id` cookie → Looks up session → Passes token to HTTP client → API validates token

3. **Logout**: UI destroys session → Clears cookie → Redirects to login

## Generated Files

When the schema has operations requiring authentication, the generator produces:

### `src/session.ts`

Session store interface and in-memory implementation:

- `Session` interface with id, token, userId, userName, expiresAt
- `SessionStore` interface with create/get/destroy methods
- `createInMemorySessionStore()` factory

### `src/layout.ts`

Extended with:

- `AuthState` type for tracking authentication
- Auth nav showing Login/Logout links based on state
- User name display when authenticated

### `src/pages.ts`

Auth pages:

- `loginPage(error?)` - Login form with optional error message
- `registerPage(error?)` - Registration form (if `createUser` operation exists)

### `src/index.ts`

Session management and auth routes:

- Session cookie handling (`getSessionId`, `setSessionCookie`, `clearSessionCookie`)
- `AuthState` type and `getAuthState(req)` helper
- `createClientForRequest(req)` - Creates HTTP client with token from session
- `/login` route (GET shows form, POST authenticates)
- `/logout` route (destroys session)
- `/register` route (if `createUser` operation exists)

## Auth Detection

The generator detects authentication requirements:

1. **Operation requires auth**: Any operation with pre-invariants referencing `context.currentUser`
2. **Login operation**: Operation with sensitive (password) input, name includes "login/signin/authenticate"
3. **Register operation**: Operation with sensitive input, name includes "create" + "user"

## Injectable Parameters

Parameters that are auto-filled from the auth context (like `userId`) are:

- **Hidden from forms**: Not rendered in the UI
- **Not passed to client**: The API injects them based on the authenticated user

This is detected via `conditionReferencesCurrentUser()` on operation invariants.

## API Strategies

The UI works with any API auth strategy:

- **SimpleBearerStrategy**: User ID is used as token
- **JwtStrategy**: JWT is stored as token in session
- **ApiKeyStrategy**: API key is stored as token

The UI doesn't know which strategy the API uses - it just stores whatever token it receives.

## Session Store Options

Currently supports:

- **In-memory store**: For development and single-instance deployments

Future options (not yet implemented):

- **Redis store**: For production multi-instance deployments

## Configuration

No special configuration needed. Authentication is automatically enabled when:

1. Schema has operations with auth requirements (via invariants)
2. Schema has a `createUser` operation (enables registration)

## Limitations

1. **No dedicated login API**: If there's no login operation in the schema, the login page prompts users to register. This is because without a login API, we can't verify passwords for existing users.

2. **Single session duration**: Sessions expire after 24 hours (hardcoded).

3. **No session persistence**: In-memory sessions are lost on server restart.

## Future Enhancements

See `TODO.md` for planned P3 items:

- UI account settings page
- UI delete account flow
- Pluggable schema components for standard auth patterns
