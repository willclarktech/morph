import { readFileSync } from "node:fs";

export const readSchemaFile = (
	schemaFile: string,
	asRawString = false,
): { ok: false } | { ok: true; schema: unknown } => {
	try {
		const schemaContent = readFileSync(schemaFile, "utf8");
		// If the parameter type is string, return raw content without parsing
		if (asRawString) {
			return { ok: true, schema: schemaContent };
		}
		return { ok: true, schema: JSON.parse(schemaContent) as unknown };
	} catch (error) {
		console.error(`Failed to read schema file: ${schemaFile}`);
		console.error(error instanceof Error ? error.message : String(error));
		return { ok: false };
	}
};

export const readUiConfigFile = async (
	configFile: string,
): Promise<{ ok: false } | { config: unknown; ok: true }> => {
	try {
		// Support both .ts and .json files
		if (configFile.endsWith(".json")) {
			const content = readFileSync(configFile, "utf8");
			return { ok: true, config: JSON.parse(content) as unknown };
		}
		// For .ts files, use dynamic import
		const module = (await import(configFile)) as { default: unknown };
		return { ok: true, config: module.default };
	} catch (error) {
		console.error(`Failed to read UI config file: ${configFile}`);
		console.error(error instanceof Error ? error.message : String(error));
		return { ok: false };
	}
};
