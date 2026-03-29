/**
 * Generate events and subscribers section.
 */
import type {
	CommandWithEvents,
	DomainSchema,
	QualifiedEntry,
	SubscriberDef,
} from "@morphdsl/domain-schema";

import { getAllSubscribers, getCommandsWithEvents } from "@morphdsl/domain-schema";

import { code, heading, list, table } from "../markdown";

/**
 * Options for generating events section.
 */
export interface EventsOptions {
	/**
	 * Heading level for the section (default: 2).
	 */
	readonly headingLevel?: 2 | 3;
}

/**
 * Generate the events section showing emitted events and subscribers.
 */
export const events = (
	schema: DomainSchema,
	options: EventsOptions = {},
): string => {
	const commandsWithEvents = getCommandsWithEvents(schema);
	const subscribers = getAllSubscribers(schema);

	if (commandsWithEvents.length === 0 && subscribers.length === 0) {
		return "";
	}

	const level = options.headingLevel ?? 2;
	const lines: string[] = [heading(level, "Events")];

	// Domain events emitted by commands
	if (commandsWithEvents.length > 0) {
		lines.push(heading((level + 1) as 3 | 4, "Domain Events"));

		// Flatten events: one row per event
		const eventRows = commandsWithEvents.flatMap((cmd: CommandWithEvents) =>
			cmd.events.map((event) => [
				code(event.name),
				code(cmd.commandName),
				event.description,
			]),
		);

		lines.push(table(["Event", "Emitted By", "Description"], eventRows));
	}

	// Subscribers
	if (subscribers.length > 0) {
		lines.push(heading((level + 1) as 3 | 4, "Subscribers"));

		for (const sub of subscribers) {
			lines.push(`**${sub.name}**: ${sub.def.description}`);
			lines.push(
				`Handles: ${list(sub.def.events.map((eventName) => code(eventName)))}`,
			);
		}
	}

	return lines.join("\n\n");
};

/**
 * Generate events section from pre-extracted data.
 * Use this when you already have the events and subscribers.
 */
export const eventsFromData = (
	commandsWithEvents: readonly CommandWithEvents[],
	subscribers: readonly QualifiedEntry<SubscriberDef>[],
	options: EventsOptions = {},
): string => {
	if (commandsWithEvents.length === 0 && subscribers.length === 0) {
		return "";
	}

	const level = options.headingLevel ?? 2;
	const lines: string[] = [heading(level, "Events")];

	// Domain events emitted by commands
	if (commandsWithEvents.length > 0) {
		lines.push(heading((level + 1) as 3 | 4, "Domain Events"));

		// Flatten events: one row per event
		const eventRows = commandsWithEvents.flatMap((cmd: CommandWithEvents) =>
			cmd.events.map((event) => [
				code(event.name),
				code(cmd.commandName),
				event.description,
			]),
		);

		lines.push(table(["Event", "Emitted By", "Description"], eventRows));
	}

	// Subscribers
	if (subscribers.length > 0) {
		lines.push(heading((level + 1) as 3 | 4, "Subscribers"));

		for (const sub of subscribers) {
			lines.push(`**${sub.name}**: ${sub.def.description}`);
			lines.push(
				`Handles: ${list(sub.def.events.map((eventName) => code(eventName)))}`,
			);
		}
	}

	return lines.join("\n\n");
};
