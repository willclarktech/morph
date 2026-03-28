import type {
	DomainSchema,
	GeneratedFile,
	SubscriberDef,
} from "@morph/domain-schema";

import { getAllSubscribers, getCommandsWithEvents } from "@morph/domain-schema";
import { toKebabCase, toPascalCase } from "@morph/utils";

/**
 * Generate subscriber interface and Context tag for a single subscriber.
 */
export const generateSubscriber = (
	name: string,
	subscriber: SubscriberDef,
	schema: DomainSchema,
	typesImportPath = "../../schemas",
	projectName = "app",
): string => {
	const pascalName = toPascalCase(name);
	const subscriberName = `${pascalName}Subscriber`;

	// Get event types this subscriber handles
	const commandsWithEvents = getCommandsWithEvents(schema);
	const eventTypes = subscriber.events
		.map((eventName) => {
			const match = commandsWithEvents.find((cmd) =>
				cmd.events.some((event) => event.name === eventName),
			);
			return match ? `${eventName}Event` : undefined;
		})
		.filter((t): t is string => t !== undefined);

	// Generate union type for events
	const eventUnionType =
		eventTypes.length > 0 ? eventTypes.join(" | ") : "DomainEvent";

	// Generate event type imports
	const eventImports =
		eventTypes.length > 0
			? `import type { ${eventTypes.join(", ")} } from "${typesImportPath}";\n`
			: `import type { DomainEvent } from "${typesImportPath}";\n`;

	const header = [
		"// Generated subscriber interface - do not edit",
		"",
		'import type { Effect } from "effect";',
		"",
		'import { Context } from "effect";',
		"",
		eventImports,
	].join("\n");

	const body = [
		`/**`,
		` * Subscriber interface for ${name}.`,
		subscriber.description ? ` * ${subscriber.description}` : "",
		` */`,
		`export interface ${subscriberName} {`,
		`\t/**`,
		`\t * Handle domain event.`,
		`\t * @param event - The domain event to handle`,
		`\t */`,
		`\treadonly handle: (event: ${eventUnionType}) => Effect.Effect<void>;`,
		`}`,
		"",
		`/**`,
		` * Context tag for ${subscriberName} dependency injection.`,
		` */`,
		`export const ${subscriberName} = Context.GenericTag<${subscriberName}>(`,
		`\t"@${projectName}/${subscriberName}",`,
		`);`,
		"",
	]
		.filter((line) => line !== "")
		.join("\n");

	return header + body;
};

/**
 * Generate all subscriber interface files for a schema.
 */
export const generateSubscribers = (
	schema: DomainSchema,
	typesImportPath = "../../schemas",
	projectName = "app",
): readonly GeneratedFile[] => {
	const subscribers = getAllSubscribers(schema);

	return subscribers.map((entry) => ({
		content: generateSubscriber(
			entry.name,
			entry.def,
			schema,
			typesImportPath,
			projectName,
		),
		filename: `subscribers/${toKebabCase(entry.name)}/index.ts`,
	}));
};
