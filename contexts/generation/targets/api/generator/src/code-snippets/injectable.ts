import type { DetectedFeatures } from "../feature-detection";

/**
 * Build injectable parameters code.
 */
export const buildInjectableParametersCode = (
	features: DetectedFeatures,
): string => {
	if (!features.hasInjectableParameters) return "";

	return `
// Injectable params inferred from invariants (auto-filled from auth context)
const injectableParams = ${JSON.stringify(features.injectableParametersMap, undefined, "\t").replaceAll("\n", "\n")};
`;
};
