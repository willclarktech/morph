import type { DomainSchema, GeneratedFile } from "@morphdsl/domain-schema";

const inferVerb = (opName: string): string => {
	if (/^create/i.test(opName)) return "creates";
	if (/^(?:get|find|list|search|fetch)/i.test(opName)) return "retrieves";
	if (/^(?:update|edit|modify)/i.test(opName)) return "updates";
	if (/^(?:delete|remove)/i.test(opName)) return "deletes";
	if (/^publish/i.test(opName)) return "publishes";
	if (/^unpublish/i.test(opName)) return "unpublishes";
	if (/^(?:complete|finish)/i.test(opName)) return "completes";
	return "invokes";
};

const inferNoun = (opName: string): string => {
	const stripped = opName.replace(
		/^(?:create|get|find|list|search|fetch|update|edit|modify|delete|remove|publish|unpublish|complete|finish|set)/i,
		"",
	);
	if (!stripped) return opName;
	const words = stripped
		.replaceAll(/([A-Z])/g, " $1")
		.trim()
		.toLowerCase();
	return words;
};

const buildTemplate = (
	opName: string,
	inputFields: readonly string[],
): string => {
	const verb = inferVerb(opName);
	const noun = inferNoun(opName);
	const stringField = inputFields.find((f) => f !== "id" && !f.endsWith("Id"));
	const firstString = stringField;

	if (verb === "invokes") {
		return firstString
			? `{actor} ${verb} ${opName} with ${firstString} "{${firstString}}"`
			: `{actor} ${verb} ${opName}`;
	}

	return firstString
		? `{actor} ${verb} a ${noun} "{${firstString}}"`
		: `{actor} ${verb} the ${noun}`;
};

export const generateDefaultProse = (
	schema: DomainSchema,
): Record<string, GeneratedFile> => {
	const files: Record<string, GeneratedFile> = {};

	for (const [contextName, context] of Object.entries(schema.contexts)) {
		const entries: string[] = [];
		const allOps: Record<string, readonly string[]> = {};

		for (const [name, cmd] of Object.entries(context.commands ?? {})) {
			allOps[name] = Object.keys(cmd.input);
		}
		for (const [name, query] of Object.entries(context.queries ?? {})) {
			allOps[name] = Object.keys(query.input);
		}

		for (const [name, inputFields] of Object.entries(allOps).sort(([a], [b]) =>
			a.localeCompare(b),
		)) {
			const template = buildTemplate(name, inputFields);
			entries.push(`\t${name}: '${template}',`);
		}

		if (entries.length === 0) continue;

		const dslModule = contextName;
		const content = [
			`import type { Prose } from "@morphdsl/operation";`,
			``,
			`import type * as ops from "./${dslModule}";`,
			``,
			`export const prose: Prose<typeof ops> = {`,
			...entries,
			`};`,
			``,
		].join("\n");

		files[contextName] = {
			content,
			filename: `contexts/${contextName}/dsl/src/prose.ts`,
		};
	}

	return files;
};
