/**
 * Morph Test Runner - CLI
 *
 * Subprocess-based test runner for executing scenarios
 * against CLI applications.
 */

// Runner factory and config types
export { createCliRunner } from "./runner";
export type {
	AuthParameters,
	CliRunnerConfig,
	OptionNames,
	ParamOrder,
	SensitiveParameters,
} from "./runner";
