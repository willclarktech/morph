/**
 * RFC 7231 Accept header parsing and content negotiation.
 *
 * Parses Accept header values like:
 *   "application/json, application/x-yaml;q=0.9, *\/*;q=0.1"
 *
 * Returns MIME types sorted by quality factor (descending).
 */

interface MediaRange {
	readonly type: string;
	readonly quality: number;
}

export const parseAcceptHeader = (accept: string): readonly MediaRange[] => {
	if (!accept || accept.trim() === "") {
		return [{ type: "*/*", quality: 1.0 }];
	}

	const ranges: MediaRange[] = [];

	for (const part of accept.split(",")) {
		const trimmed = part.trim();
		if (!trimmed) continue;

		const semicolonIdx = trimmed.indexOf(";");
		if (semicolonIdx === -1) {
			ranges.push({ type: trimmed, quality: 1.0 });
			continue;
		}

		const type = trimmed.slice(0, semicolonIdx).trim();
		const params = trimmed.slice(semicolonIdx + 1);
		let quality = 1.0;

		for (const param of params.split(";")) {
			const [key, value] = param.split("=").map((s) => s.trim());
			if (key === "q" && value !== undefined) {
				const parsed = Number.parseFloat(value);
				if (!Number.isNaN(parsed)) {
					quality = Math.max(0, Math.min(1, parsed));
				}
			}
		}

		ranges.push({ type, quality });
	}

	return ranges.toSorted((a, b) => b.quality - a.quality);
};

export const negotiateMime = (
	accept: string,
	mimeMap: ReadonlyMap<string, string>,
	defaultFormat: string,
): string | undefined => {
	const ranges = parseAcceptHeader(accept);

	for (const range of ranges) {
		if (range.type === "*/*") {
			return defaultFormat;
		}

		// Match exact MIME type
		const format = mimeMap.get(range.type);
		if (format !== undefined) {
			return format;
		}

		// Match wildcard subtypes (e.g., "application/*")
		if (range.type.endsWith("/*")) {
			const prefix = range.type.slice(0, -1);
			for (const [mime, fmt] of mimeMap) {
				if (mime.startsWith(prefix)) {
					return fmt;
				}
			}
		}
	}

	return undefined;
};
