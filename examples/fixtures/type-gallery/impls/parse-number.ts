// Implementation of parseNumber function

import type { Result } from "@type-gallery/types-dsl";

export const parseNumber = (
	params: { readonly raw: string },
	_options: Record<string, never>,
): Result<number, string> => {
	const parsed = Number(params.raw);
	if (Number.isNaN(parsed)) {
		return {
			kind: "err",
			error: `Cannot parse "${params.raw}" as a number`,
		};
	}
	return { kind: "ok", value: parsed };
};
