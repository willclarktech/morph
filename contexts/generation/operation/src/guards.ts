import type * as S from "effect/Schema";

import { OPERATION_BRAND, type OperationDefinition } from "./define-operation";

/**
 * Type alias for any operation definition.
 * Use this when you need to work with operations generically.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyOperation = OperationDefinition<S.Schema.All, S.Schema.All, any>;

/**
 * Type guard for operation definitions.
 */
export const isOperation = (value: unknown): value is AnyOperation =>
	typeof value === "object" && value !== null && OPERATION_BRAND in value;
