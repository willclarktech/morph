import type { DetectedFeatures } from "../feature-detection";

/**
 * Build codec registry import statement.
 */
export const buildEncodingImport = (features: DetectedFeatures): string => {
	if (!features.hasEncoding) return "";

	const imports: string[] = ["createCodecRegistry"];
	const codecImports: string[] = [];

	for (const format of features.encodingFormats) {
		switch (format) {
			case "json": {
				codecImports.push(
					`import { createJsonCodec } from "@morph/codec-json-impls";`,
				);
				break;
			}
			case "protobuf": {
				codecImports.push(
					`import { createProtobufCodec } from "@morph/codec-protobuf-impls";`,
				);
				break;
			}
			case "yaml": {
				codecImports.push(
					`import { createYamlCodec } from "@morph/codec-yaml-impls";`,
				);
				break;
			}
		}
	}

	return [
		`import { ${imports.join(", ")} } from "@morph/codec-impls";`,
		...codecImports,
	].join("\n");
};

/**
 * Build codec registry setup code.
 */
export const buildEncodingSetup = (features: DetectedFeatures): string => {
	if (!features.hasEncoding) return "";

	const codecs: string[] = [];
	for (const format of features.encodingFormats) {
		switch (format) {
			case "json": {
				codecs.push("createJsonCodec()");
				break;
			}
			case "protobuf": {
				codecs.push("createProtobufCodec()");
				break;
			}
			case "yaml": {
				codecs.push("createYamlCodec()");
				break;
			}
		}
	}

	const defaultFormat = features.encodingDefault ?? "json";
	return `\n\tconst codecRegistry = createCodecRegistry(\n\t\t[${codecs.join(", ")}],\n\t\t"${defaultFormat}",\n\t);\n`;
};
