import type { GeneratedFile } from "@morph/domain-schema";

/**
 * Generate the layers file that exports layer configurations.
 * Re-exports HandlersLayer and MockHandlersLayer from operations.
 */
export const generateLayerSelector = (_envPrefix: string): GeneratedFile => {
	const content = [
		"// Generated layers file",
		"// Re-exports layer compositions from operations barrel",
		"",
		'export { HandlersLayer, MockHandlersLayer } from "./operations";',
		"",
	].join("\n");

	return {
		content,
		filename: "layers.ts",
	};
};
