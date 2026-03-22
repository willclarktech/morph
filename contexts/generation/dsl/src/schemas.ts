// Generated from DomainSchema: Morph
// Do not edit manually

// Effect/Schema Definitions

import * as S from "effect/Schema";

// Pure Type Schemas (transformation-centric)

// A file produced by code generation
export const GeneratedFileSchema = S.Struct({
	content: S.String,
	filename: S.String,
});

export type GeneratedFile = S.Schema.Type<typeof GeneratedFileSchema>;

export const parseGeneratedFile = S.decodeUnknownSync(GeneratedFileSchema);
export const parseGeneratedFileEither =
	S.decodeUnknownEither(GeneratedFileSchema);
export const encodeGeneratedFile = S.encodeSync(GeneratedFileSchema);

// Result of a generation operation
export const GenerationResultSchema = S.Struct({
	files: S.Array(GeneratedFileSchema),
});

export type GenerationResult = S.Schema.Type<typeof GenerationResultSchema>;

export const parseGenerationResult = S.decodeUnknownSync(
	GenerationResultSchema,
);
export const parseGenerationResultEither = S.decodeUnknownEither(
	GenerationResultSchema,
);
export const encodeGenerationResult = S.encodeSync(GenerationResultSchema);

// Function Schemas (pure transformations)

import { InvalidSchemaError } from "./errors";

// Generate all packages from a domain schema
export const GenerateInputSchema = S.Struct({
	name: S.String,
	schema: S.String,
});

export type GenerateInput = S.Schema.Type<typeof GenerateInputSchema>;
export type GenerateOutput = GenerationResult;
export type GenerateError = InvalidSchemaError;

// Initialize a new morph monorepo scaffold
export const InitInputSchema = S.Struct({
	name: S.String,
});

export type InitInput = S.Schema.Type<typeof InitInputSchema>;
export type InitOutput = GenerationResult;

// Create a new morph project (init + generate)
export const NewProjectInputSchema = S.Struct({
	name: S.String,
	schema: S.String,
});

export type NewProjectInput = S.Schema.Type<typeof NewProjectInputSchema>;
export type NewProjectOutput = GenerationResult;
export type NewProjectError = InvalidSchemaError;

// Validate a domain schema
export const ValidateInputSchema = S.Struct({
	schema: S.String,
});

export type ValidateInput = S.Schema.Type<typeof ValidateInputSchema>;
export type ValidateOutput = void;
export type ValidateError = InvalidSchemaError;
