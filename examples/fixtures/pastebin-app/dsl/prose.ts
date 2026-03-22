/**
 * Prose templates for pastebin-app operations.
 *
 * This file is a FIXTURE - hand-written, survives regeneration.
 * Provides human-readable templates for test output and feature files.
 *
 * Template syntax:
 * - {paramName} - placeholder for param value
 * - [paramName? text] - conditional, shown only if param is truthy
 * - {actor} - replaced with scenario actor if present (runtime only)
 * - {$binding.field} - reference to a bound value from a previous step (runtime only)
 */
import type { Prose } from "@morph/operation";

import type * as ops from "./pastes";

export const prose: Prose<typeof ops> = {
	createPaste:
		'{actor} creates a paste [title?titled "{title}"] with content "{content}"',
	getPaste: "{actor} gets the paste",
	listPastes: "{actor} lists all pastes",
	deletePaste: "{actor} deletes the paste",
};
