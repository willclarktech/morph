import type { ConstraintDef } from "@morphdsl/domain-schema";

/**
 * Convert a ConstraintDef to its Effect/Schema refinement string.
 */
const constraintToRefinement = (constraint: ConstraintDef): string => {
	switch (constraint.kind) {
		case "custom": {
			return ` /* Custom: ${constraint.name} */`;
		}

		case "nonEmpty": {
			return ".pipe(S.nonEmptyString())";
		}

		case "pattern": {
			return `.pipe(S.pattern(/${constraint.regex}/))`;
		}

		case "positive": {
			return ".pipe(S.positive())";
		}

		case "range": {
			const { max, min } = constraint;
			if (min !== undefined && max !== undefined) {
				return `.pipe(S.between(${min}, ${max}))`;
			}
			if (min !== undefined) {
				return `.pipe(S.greaterThanOrEqualTo(${min}))`;
			}
			if (max !== undefined) {
				return `.pipe(S.lessThanOrEqualTo(${max}))`;
			}
			return "";
		}

		case "unique": {
			// Unique constraints are metadata for the repository layer,
			// not Effect/Schema refinements
			return "";
		}

		default: {
			const _exhaustive: never = constraint;
			return _exhaustive;
		}
	}
};

/**
 * Convert multiple constraints to a combined refinement string.
 */
export const constraintsToRefinements = (
	constraints: readonly ConstraintDef[] | undefined,
): string => {
	if (constraints === undefined || constraints.length === 0) {
		return "";
	}
	return constraints.map((c) => constraintToRefinement(c)).join("");
};
