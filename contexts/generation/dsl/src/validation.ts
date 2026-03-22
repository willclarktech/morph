// Validation result types for schema validation

/**
 * A single validation issue (error or warning).
 */
export interface ValidationIssue {
	readonly message: string;
	readonly path?: string;
}

/**
 * Schema summary information.
 */
export interface SchemaSummary {
	readonly contexts: number;
	readonly entities: number;
	readonly operations: number;
	readonly functions: number;
	readonly valueObjects: number;
}

/**
 * Result of validating a domain schema.
 */
export interface ValidationResult {
	readonly status: "valid" | "invalid";
	readonly errors: readonly ValidationIssue[];
	readonly warnings: readonly ValidationIssue[];
	readonly summary?: SchemaSummary;
}
