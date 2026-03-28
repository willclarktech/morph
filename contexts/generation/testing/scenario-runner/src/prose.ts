import type { Step } from "@morph/scenario";

import { interpolate, isAssertion } from "@morph/scenario";

import type { Prose } from "./index";

import { formatAssertionProse } from "./assertions";
import { interpolateBindings } from "./bindings";

export const renderStepProse = (
	step: Step,
	actor: string | undefined,
	prose?: Prose,
	bindings?: Map<string, unknown>,
): string => {
	if (isAssertion(step.operation)) {
		const assertion = step.operation;
		if (assertion.prose) {
			return assertion.prose;
		}
		const subject =
			assertion.subject === "lastResult" ? "the result" : assertion.subject;
		const field = assertion.field ? `.${assertion.field}` : "";
		return formatAssertionProse(subject, field, assertion.matcher);
	}

	const op = step.operation;
	const template = prose?.[op.name];

	if (template) {
		const context = actor === undefined ? undefined : { actor };
		let result = interpolate(
			template,
			op.params as Record<string, unknown>,
			context,
		);
		if (bindings) {
			result = interpolateBindings(result, bindings);
		}
		return result;
	}

	const params = Object.entries(op.params as Record<string, unknown>)
		.map(([k, v]) => `${k}=${JSON.stringify(v)}`)
		.join(", ");
	return `${op.name}(${params})`;
};
