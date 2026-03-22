/**
 * Prose templates for todo-app operations.
 *
 * This file is a FIXTURE - hand-written, survives regeneration.
 * Provides human-readable templates for test output and feature files.
 *
 * Template syntax:
 * - {paramName} - placeholder for param value
 * - [paramName? text] - conditional, shown only if param is truthy
 * - {actor} - replaced with scenario actor if present
 * - {$binding.field} - reference to a bound value from a previous step (runtime only)
 */
import type { Prose } from "@morph/operation";

import type * as ops from "./tasks";

export const prose: Prose<typeof ops> = {
	createUser: '{actor} creates a user with name "{name}" and email "{email}"',
	createTodo: '{actor} creates a todo "{title}"',
	completeTodo: '{actor} completes the todo "{$todo.title}"',
	deleteTodo: '{actor} deletes the todo "{$todo.title}"',
	listTodos: "{actor} lists todos [includeCompleted?including completed]",
};
