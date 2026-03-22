/**
 * Utility functions for services generators.
 */

/**
 * Convert app name to env var prefix (e.g., "todo-app" -> "TODO_APP").
 */
export const toEnvironmentPrefix = (name: string): string =>
	name.toUpperCase().replaceAll("-", "_");
