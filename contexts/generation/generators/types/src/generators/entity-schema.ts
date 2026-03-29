import type {
	CommandDef,
	EmittedEventDef,
	EntityDef,
} from "@morphdsl/domain-schema";

import { constraintsToRefinements } from "../mappers/constraint";
import { typeRefToSchema } from "../mappers/schema-reference";

const capitalize = (s: string): string =>
	s.charAt(0).toUpperCase() + s.slice(1);

export const generateEntitySchema = (
	name: string,
	entity: EntityDef,
): string => {
	const attributes = Object.entries(entity.attributes).filter(
		([attributeName]) => attributeName !== "id",
	);

	const idField = `\tid: ${name}IdSchema,`;

	const fields = attributes.map(([attributeName, attributeDef]) => {
		const baseSchema = typeRefToSchema(attributeDef.type);
		const refinements = constraintsToRefinements(attributeDef.constraints);
		const optionalWrapper = attributeDef.optional ? "S.optional(" : "";
		const optionalClose = attributeDef.optional ? ")" : "";
		return `\t${attributeName}: ${optionalWrapper}${baseSchema}${refinements}${optionalClose},`;
	});

	return [
		`export const ${name}Schema = S.Struct({`,
		idField,
		...fields,
		"});",
		"",
		`export type ${name} = S.Schema.Type<typeof ${name}Schema>;`,
		"",
		`export const parse${name} = S.decodeUnknownSync(${name}Schema);`,
		`export const parse${name}Either = S.decodeUnknownEither(${name}Schema);`,
		`export const encode${name} = S.encodeSync(${name}Schema);`,
	].join("\n");
};

export const generateEventSchema = (
	commandName: string,
	command: CommandDef,
	event: EmittedEventDef,
): string => {
	const eventName = event.name;
	const capitalizedCmdName = capitalize(commandName);

	const inputSchemaName = `${capitalizedCmdName}InputSchema`;
	const inputTypeName = `${capitalizedCmdName}Input`;

	const inputParameters = Object.entries(command.input);
	const inputFields = inputParameters.map(([parameterName, parameterDef]) => {
		const baseSchema = typeRefToSchema(parameterDef.type);
		const optionalWrapper = parameterDef.optional ? "S.optional(" : "";
		const optionalClose = parameterDef.optional ? ")" : "";
		return `\t${parameterName}: ${optionalWrapper}${baseSchema}${optionalClose},`;
	});

	const resultSchema = typeRefToSchema(command.output);

	return [
		`// Input schema for ${commandName}`,
		`export const ${inputSchemaName} = S.Struct({`,
		...inputFields,
		"});",
		`export type ${inputTypeName} = S.Schema.Type<typeof ${inputSchemaName}>;`,
		"",
		`// Event: ${eventName}`,
		`export const ${eventName}EventSchema = S.Struct({`,
		`\t_tag: S.Literal("${eventName}"),`,
		`\taggregateId: S.String,`,
		`\toccurredAt: S.String,`,
		`\tparams: ${inputSchemaName},`,
		`\tresult: ${resultSchema},`,
		`\tversion: S.Number,`,
		"});",
		"",
		`export type ${eventName}Event = S.Schema.Type<typeof ${eventName}EventSchema>;`,
	].join("\n");
};
