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
	if (value == undefined) return EMPTY;
	const d = typeof value === "string" ? new Date(value) : value;
	if (!(d instanceof Date) || Number.isNaN(d.getTime())) return typeof value === "string" ? value : "Invalid date";
	return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

export const formatArray = (value: unknown): string => {
	if (!Array.isArray(value) || value.length === 0) return EMPTY;
	return value.map(v => \`<kbd>\${String(v)}</kbd>\`).join(" ");
};

export const formatValue = (value: unknown): string => {
	if (value == undefined) return EMPTY;
	if (typeof value === "object") return JSON.stringify(value);
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return EMPTY;
};
`;
