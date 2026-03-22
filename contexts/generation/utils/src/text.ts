/**
 * Pluralize a word using simple English rules.
 *
 * @example
 * pluralize("entity") // "entities"
 * pluralize("bus") // "buses"
 * pluralize("box") // "boxes"
 * pluralize("batch") // "batches"
 * pluralize("item") // "items"
 */
export const pluralize = (word: string): string => {
	if (word.endsWith("y")) {
		return word.slice(0, -1) + "ies";
	}
	if (word.endsWith("s") || word.endsWith("x") || word.endsWith("ch")) {
		return word + "es";
	}
	return word + "s";
};
