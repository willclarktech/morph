import type {
	AnyPropertySuite,
	OperationPropertySuite,
	ValidatorPropertySuite,
} from "./property";

/**
 * Check if a property suite is a validator suite.
 */
export const isValidatorSuite = (
	suite: AnyPropertySuite,
): suite is ValidatorPropertySuite<unknown, unknown> =>
	suite.suiteType === "validator";

/**
 * Check if a property suite is an operation suite.
 */
export const isOperationSuite = (
	suite: AnyPropertySuite,
): suite is OperationPropertySuite<unknown, unknown, unknown> =>
	suite.suiteType === "operation";
