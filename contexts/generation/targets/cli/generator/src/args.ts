/**
 * CLI argument parsing for backend selection flags.
 */

/**
 * Parse a backend selection flag from CLI argv.
 * Returns the flag value, env var value, or undefined to let the caller use its own default.
 */
export const parseBackendArgument = (
	argv: readonly string[],
	flag: string,
	envKey: string,
): string | undefined => {
	const flagIndex = argv.indexOf(flag);
	const flagValue = flagIndex === -1 ? undefined : argv[flagIndex + 1];
	if (flagValue) return flagValue;
	return process.env[envKey];
};

/**
 * Filter a backend selection flag (and its value) from argv.
 */
export const filterBackendArgument = (
	argv: readonly string[],
	flag: string,
): readonly string[] => {
	const flagIndex = argv.indexOf(flag);
	if (flagIndex === -1) return argv;
	return [...argv.slice(0, flagIndex), ...argv.slice(flagIndex + 2)];
};
