import type { GeneratedFile, GenerationResult } from "@morphdsl/domain-schema";

const isGeneratedFile = (value: unknown): value is GeneratedFile =>
	value !== null &&
	typeof value === "object" &&
	// Accept either "filename" (domain-schema) or "path" (custom schemas)
	(("filename" in value &&
		typeof (value as GeneratedFile).filename === "string") ||
		("path" in value &&
			typeof (value as { path: unknown }).path === "string")) &&
	"content" in value &&
	typeof (value as GeneratedFile).content === "string";

export const isGenerationResult = (value: unknown): value is GenerationResult =>
	value !== null &&
	typeof value === "object" &&
	"files" in value &&
	Array.isArray((value as { files: unknown }).files) &&
	(value as { files: unknown[] }).files.every((file) => isGeneratedFile(file));
