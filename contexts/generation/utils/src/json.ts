export const taggedReplacer = function (
	this: Record<string, unknown>,
	key: string,
	value: unknown,
): unknown {
	const raw = this[key];
	if (typeof raw === "bigint") return { $bigint: String(raw) };
	if (raw instanceof Date) return { $date: raw.toISOString() };
	return value;
};

export const taggedReviver = (_key: string, value: unknown): unknown => {
	if (typeof value === "object" && value !== null) {
		const obj = value as Record<string, unknown>;
		if ("$bigint" in obj && typeof obj["$bigint"] === "string")
			return BigInt(obj["$bigint"]);
		if ("$date" in obj && typeof obj["$date"] === "string")
			return new Date(obj["$date"] as string);
	}
	return value;
};

export const jsonStringify = (
	value: unknown,
	indent?: number | string,
): string => JSON.stringify(value, taggedReplacer, indent ?? "\t");

export const jsonParse = (text: string): unknown =>
	JSON.parse(text, taggedReviver);
