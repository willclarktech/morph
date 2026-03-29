import type {
	DomainSchema,
	GeneratedFile,
	GenerationResult,
} from "@morphdsl/domain-schema";

import { getAllOperations } from "@morphdsl/domain-schema";

import { generateDateFieldsModule } from "./date-fields-gen";
import { generateProtoFile } from "./message-gen";

export interface GenerateProtoOptions {
	readonly packageDir?: string;
	readonly schema: DomainSchema;
	readonly sourceDir?: string;
}

const capitalize = (s: string): string =>
	s.charAt(0).toUpperCase() + s.slice(1);

const outputTypeName = (
	output: DomainSchema["contexts"][string]["commands"][string]["output"],
): string => {
	switch (output.kind) {
		case "array": {
			return outputTypeName(output.element);
		}
		case "entity":
		case "type":
		case "valueObject": {
			return output.name;
		}
		case "entityId":
		case "function":
		case "generic":
		case "primitive":
		case "typeParam":
		case "union": {
			return "";
		}
		case "optional": {
			return outputTypeName(output.inner);
		}
	}
};

export const generate = (options: GenerateProtoOptions): GenerationResult => {
	const packageDir = options.packageDir ?? "libs/proto";
	const sourceDir = options.sourceDir ?? "src";
	const prefix = `${packageDir}/${sourceDir}/`;
	const schema = options.schema;

	const files: GeneratedFile[] = [];

	files.push({
		content: generateProtoFile(schema),
		filename: `${prefix}domain.proto`,
	});

	files.push({
		content: generateDateFieldsModule(schema),
		filename: `${prefix}date-fields.ts`,
	});

	const package_ = schema.name.toLowerCase();
	const mappingEntries = getAllOperations(schema).map((op) => {
		const inputMessage = `${package_}.${capitalize(op.name)}Input`;
		const outName = outputTypeName(op.def.output);
		const outputMessage = outName
			? `${package_}.${outName}`
			: `${package_}.${capitalize(op.name)}Output`;
		return `\t${op.name}: { input: "${inputMessage}", output: "${outputMessage}" }`;
	});

	const protoMapContent =
		mappingEntries.length > 0
			? `export const PROTO_MAP: Record<string, { readonly input: string; readonly output: string }> = {\n${mappingEntries.join(",\n")},\n};\n`
			: `export const PROTO_MAP: Record<string, { readonly input: string; readonly output: string }> = {};\n`;

	files.push({
		content: protoMapContent,
		filename: `${prefix}proto-map.ts`,
	});

	return { files };
};
