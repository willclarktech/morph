/**
 * Generator for runtime formatters module.
 * Emits a formatters.ts file into generated output with pure display functions.
 */

export const generateFormattersModule = (): string => `/**
 * Display formatters for entity values.
 */

const EMPTY = "\u2014";

export const formatBoolean = (value: unknown): string => {
	if (value === true) return "\u2713";
	if (value === false) return "\u2717";
	return EMPTY;
};

export const formatDate = (value: unknown): string => {
	if (value === undefined || value === null) return EMPTY;
	const d = typeof value === "string" ? new Date(value) : value;
	if (!(d instanceof Date) || isNaN(d.getTime())) return String(value);
	return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

export const formatArray = (value: unknown): string => {
	if (!Array.isArray(value) || value.length === 0) return EMPTY;
	return value.map(v => \`<kbd>\${String(v)}</kbd>\`).join(" ");
};

export const formatValue = (value: unknown): string => {
	if (value === undefined || value === null) return EMPTY;
	return String(value);
};
`;
