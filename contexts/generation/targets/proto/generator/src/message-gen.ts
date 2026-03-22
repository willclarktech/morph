import type {
	AttributeDef,
	CommandDef,
	DomainSchema,
	ParamDef,
	QueryDef,
} from "@morph/domain-schema";

import { getAllEntities, getAllOperations } from "@morph/domain-schema";

import { isTimestampType, typeRefToProto } from "./type-mapping";

const capitalize = (s: string): string =>
	s.charAt(0).toUpperCase() + s.slice(1);

const generateFieldsFromAttributes = (
	attributes: Readonly<Record<string, AttributeDef>>,
): string => {
	const entries = Object.entries(attributes);
	return entries
		.map(([name, attribute], index) => {
			const protoType = typeRefToProto(attribute.type);
			const isRepeated = protoType.startsWith("repeated ");
			const optional = attribute.optional && !isRepeated ? "optional " : "";
			return `\t${optional}${protoType} ${name} = ${index + 1};`;
		})
		.join("\n");
};

const generateFieldsFromParams = (
	params: Readonly<Record<string, ParamDef>>,
): string => {
	const entries = Object.entries(params);
	return entries
		.map(([name, param], index) => {
			const protoType = typeRefToProto(param.type);
			const isRepeated = protoType.startsWith("repeated ");
			const optional = param.optional && !isRepeated ? "optional " : "";
			return `\t${optional}${protoType} ${name} = ${index + 1};`;
		})
		.join("\n");
};

const generateEntityMessage = (
	name: string,
	attributes: Readonly<Record<string, AttributeDef>>,
): string => {
	const fields = generateFieldsFromAttributes(attributes);
	return `message ${name} {\n${fields}\n}`;
};

const generateOperationInputMessage = (
	opName: string,
	opDef: CommandDef | QueryDef,
): string | undefined => {
	const entries = Object.entries(opDef.input);
	if (entries.length === 0) return undefined;
	const fields = generateFieldsFromParams(opDef.input);
	return `message ${capitalize(opName)}Input {\n${fields}\n}`;
};

const hasTimestampFields = (schema: DomainSchema): boolean => {
	for (const entity of getAllEntities(schema)) {
		for (const attribute of Object.values(entity.def.attributes)) {
			if (isTimestampType(attribute.type)) return true;
		}
	}
	for (const op of getAllOperations(schema)) {
		for (const param of Object.values(op.def.input)) {
			if (isTimestampType(param.type)) return true;
		}
	}
	return false;
};

export const generateProtoFile = (schema: DomainSchema): string => {
	const lines: string[] = [
		'syntax = "proto3";',
		"",
		`package ${schema.name.toLowerCase()};`,
		"",
	];

	if (hasTimestampFields(schema)) {
		lines.push('import "google/protobuf/timestamp.proto";');
		lines.push("");
	}

	for (const entity of getAllEntities(schema)) {
		lines.push(generateEntityMessage(entity.name, entity.def.attributes));
		lines.push("");
	}

	for (const op of getAllOperations(schema)) {
		const inputMessage = generateOperationInputMessage(op.name, op.def);
		if (inputMessage) {
			lines.push(inputMessage);
			lines.push("");
		}
	}

	return lines.join("\n");
};
