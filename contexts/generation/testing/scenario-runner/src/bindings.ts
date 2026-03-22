import { getField } from "./assertions";

export const resolveParameters = (
	params: unknown,
	bindings: Map<string, unknown>,
	injectableParamNames?: readonly string[],
): unknown => {
	if (typeof params !== "object" || params === null) return params;

	const injectableSet = injectableParamNames
		? new Set(injectableParamNames)
		: undefined;

	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(
		params as Record<string, unknown>,
	)) {
		if (typeof value === "string" && value.startsWith("$")) {
			const bindingName = value.slice(1);
			const parts = bindingName.split(".");
			const rootBinding = parts[0];
			const path = parts.slice(1);
			let resolved = rootBinding ? bindings.get(rootBinding) : undefined;
			for (const part of path) {
				resolved = getField(resolved, part);
			}
			if (resolved !== undefined || !injectableSet?.has(key)) {
				result[key] = resolved;
			}
		} else {
			result[key] = value;
		}
	}
	return result;
};

export const interpolateBindings = (
	text: string,
	bindings: Map<string, unknown>,
): string => {
	const resolvePath = (path: string): string | undefined => {
		const parts = path.split(".");
		const rootBinding = parts[0];
		let resolved: unknown = rootBinding ? bindings.get(rootBinding) : undefined;
		for (const part of parts.slice(1)) {
			resolved = getField(resolved, part);
		}
		return resolved === undefined
			? undefined
			: typeof resolved === "string"
				? resolved
				: JSON.stringify(resolved);
	};

	return text.replaceAll(/\{\$(\w+(?:\.\w+)*)\}/g, (match, path: string) => {
		return resolvePath(path) ?? match;
	});
};
