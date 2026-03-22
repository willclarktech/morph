import type { OperationCall } from "@morph/operation";

import type { Assertion } from "./scenario";

/**
 * Check if an operation is an assertion.
 */
export const isAssertion = (
	op: Assertion | OperationCall<unknown, unknown>,
): op is Assertion => op._tag === "Assertion";
