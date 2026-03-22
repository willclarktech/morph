/**
 * Password hashing utilities using Bun's built-in bcrypt.
 */
import { Effect } from "effect";

import {
	PasswordHashError,
	PasswordVerifyError,
} from "@morph/auth-password-dsl";

/**
 * Hash a plain text password using bcrypt.
 */
export const hashPassword = (
	password: string,
): Effect.Effect<string, PasswordHashError> =>
	Effect.tryPromise({
		catch: (error) =>
			new PasswordHashError({
				message: `Failed to hash password: ${String(error)}`,
			}),
		try: () => Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 }),
	});

/**
 * Verify a plain text password against a bcrypt hash.
 */
export const verifyPassword = (
	password: string,
	hash: string,
): Effect.Effect<boolean, PasswordVerifyError> =>
	Effect.tryPromise({
		catch: (error) =>
			new PasswordVerifyError({
				message: `Failed to verify password: ${String(error)}`,
			}),
		try: () => Bun.password.verify(password, hash),
	});
