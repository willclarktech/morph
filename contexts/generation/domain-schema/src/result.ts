/**
 * Shared types for code generation results.
 *
 * All generators produce GenerationResult containing GeneratedFile entries.
 */

export interface GeneratedFile {
	readonly content: string;
	readonly filename: string;
	/** If true, file is a scaffold meant for user editing - skip if exists unless forced */
	readonly scaffold?: boolean;
}

export interface GenerationResult {
	readonly files: readonly GeneratedFile[];
}
