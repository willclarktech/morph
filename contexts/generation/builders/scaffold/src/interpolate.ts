/**
 * Interpolate template variables in a string.
 * Uses {{variable}} syntax for substitution.
 */
export const interpolate = (
	template: string,
	variables: Readonly<Record<string, string>>,
): string =>
	template.replaceAll(
		/\{\{(\w+)\}\}/g,
		(_, key: string) => variables[key] ?? `{{${key}}}`,
	);
