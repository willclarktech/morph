/**
 * Interpolate a template string with parameter values.
 *
 * @param template - Template string with {param} placeholders
 * @param params - Parameter values to interpolate
 * @param context - Additional context like actor name
 * @returns Interpolated string
 */
export const interpolate = (
	template: string,
	params: Record<string, unknown>,
	context?: { actor?: string },
): string => {
	let result = template;

	// Replace {actor} with context actor
	if (context?.actor) {
		result = result.replaceAll("{actor}", context.actor);
	}

	// Process conditionals: [paramName? text] - only render if value is truthy
	result = result.replaceAll(
		/\[(\w+)\?([^\]]+)\]/g,
		(_, parameterName: string, rawText: string) => {
			const value = params[parameterName];
			if (!value) return "";
			// Trim leading whitespace and replace {paramName} within the conditional text
			const text = rawText.trimStart();
			const displayValue =
				typeof value === "string" ? value : JSON.stringify(value);
			return text.replaceAll(`{${parameterName}}`, displayValue);
		},
	);

	// Replace {param} placeholders with actual values
	for (const [key, value] of Object.entries(params)) {
		const displayValue =
			typeof value === "string" ? value : JSON.stringify(value);
		result = result.replaceAll(`{${key}}`, displayValue);
	}

	return result;
};
