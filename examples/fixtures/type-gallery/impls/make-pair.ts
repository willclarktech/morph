// Implementation of makePair function

import type { Pair } from "@type-gallery/types-dsl";

export const makePair = (
	params: { readonly first: string; readonly second: string },
	_options: Record<string, never>,
): Pair<string, string> => ({
	first: params.first,
	second: params.second,
});
