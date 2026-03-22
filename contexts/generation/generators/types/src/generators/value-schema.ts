import type { ValueObjectDef } from "@morph/domain-schema";

import { constraintsToRefinements } from "../mappers/constraint";
import { typeRefToSchema } from "../mappers/schema-reference";

export const generateValueObjectSchema = (
	name: string,
	vo: ValueObjectDef,
): string => {
	const attributes = Object.entries(vo.attributes);

	const fields = attributes.map(([attributeName, attributeDef]) => {
		const baseSchema = typeRefToSchema(attributeDef.type);
		const refinements = constraintsToRefinements(attributeDef.constraints);
		return `\t${attributeName}: ${baseSchema}${refinements},`;
	});

	return [
		`export const ${name}Schema = S.Struct({`,
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
