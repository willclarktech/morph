/**
 * Resolve an unprefixed operation name against a set of known (possibly prefixed) names.
 *
 * Multi-context apps prefix operation names with the context:
 *   MCP/core: `contextName_opName` (underscore)
 *   CLI: `contextName:opName` (colon)
 *
 * Scenarios always use unprefixed names. This function finds the matching
 * prefixed name by checking for suffix matches.
 */
export const resolveOperationName = (
	name: string,
	knownNames: readonly string[],
): string => {
	if (knownNames.includes(name)) return name;

	const matches = knownNames.filter(
		(known) => known.endsWith(`_${name}`) || known.endsWith(`:${name}`),
	);

	if (matches.length === 1) return matches[0]!;

	return name;
};
