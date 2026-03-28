import type {
	DomainSchema,
	GeneratedFile,
	SubscriberDef,
} from "@morph/domain-schema";

import { getAllSubscribers } from "@morph/domain-schema";
import { indent, toKebabCase, toPascalCase } from "@morph/utils";

/**
 * Generate a scaffold subscriber implementation file.
 * This is meant to be edited by the user - not regenerated.
 */
export const generateSubscriberImpl = (
	name: string,
	subscriber: SubscriberDef,
): string => {
	const pascalName = toPascalCase(name);
	const subscriberName = `${pascalName}Subscriber`;

	const header = [
		"// Subscriber implementation - edit this file to implement the handler logic",
		"",
		'import { Effect, Layer } from "effect";',
		"",
		`import { ${subscriberName} } from ".";`,
		"",
	].join("\n");

	const handleBody = `// TODO: Implement ${name}
// Handles events: ${subscriber.events.join(", ")}
yield* Effect.logInfo(\`${subscriberName} received \${event._tag}\`);`;

	const body = [
		`/**`,
		` * Implementation of ${name} subscriber.`,
		` * ${subscriber.description}`,
		` */`,
		`export const ${subscriberName}Live = Layer.succeed(`,
		indent(`${subscriberName},`, 1),
		indent(`{`, 1),
		indent(`handle: (event) =>`, 2),
		indent(`Effect.gen(function* () {`, 3),
		indent(handleBody, 4),
		indent(`}),`, 3),
		indent(`},`, 1),
		`);`,
		"",
	].join("\n");

	return header + body;
};

/**
 * Generate all subscriber implementation files for a schema.
 * These are scaffolds meant to be edited by the user.
 */
export const generateSubscriberImpls = (
	schema: DomainSchema,
): readonly GeneratedFile[] => {
	const subscribers = getAllSubscribers(schema);

	return subscribers.map((entry) => ({
		content: generateSubscriberImpl(entry.name, entry.def),
		filename: `subscribers/${toKebabCase(entry.name)}/impl.ts`,
		scaffold: true,
	}));
};
