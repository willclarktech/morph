import { Effect } from "effect";
import { parseDocument, stringify } from "yaml";

import type { Codec } from "@morph/codec-dsl";
import { CodecDecodeError, CodecEncodeError } from "@morph/codec-dsl";

const YAML_MIME = "application/x-yaml";
const BIGINT_MARKER = "__$bigint__";
const DATE_MARKER = "__$date__";
const ISO_DATE_RE =
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * Pre-process values for YAML encoding.
 * - BigInt → tagged object marker (YAML can't natively handle BigInt)
 * - Date → tagged object marker with ISO string (avoids YAML 1.1 quirks)
 */
const prepareForYaml = (value: unknown): unknown => {
	if (typeof value === "bigint") return { [BIGINT_MARKER]: String(value) };
	if (value instanceof Date) return { [DATE_MARKER]: value.toISOString() };
	if (Array.isArray(value)) return value.map(prepareForYaml);
	if (typeof value === "object" && value !== null) {
		const result: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			result[k] = prepareForYaml(v);
		}
		return result;
	}
	return value;
};

/**
 * Post-process values from YAML decoding.
 * - Restores BigInt from tagged object markers
 * - Restores Date from tagged object markers
 */
const restoreFromYaml = (value: unknown): unknown => {
	if (Array.isArray(value)) return value.map(restoreFromYaml);
	if (typeof value === "object" && value !== null) {
		const obj = value as Record<string, unknown>;
		if (BIGINT_MARKER in obj && typeof obj[BIGINT_MARKER] === "string") {
			return BigInt(obj[BIGINT_MARKER]);
		}
		if (DATE_MARKER in obj && typeof obj[DATE_MARKER] === "string") {
			return new Date(obj[DATE_MARKER]);
		}
		const result: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(obj)) {
			result[k] = restoreFromYaml(v);
		}
		return result;
	}
	return value;
};

export const createYamlCodec = (): Codec => ({
	format: "yaml",
	mimeContribution: {
		format: "yaml",
		mimeTypes: [YAML_MIME, "text/yaml", "text/x-yaml"],
	},

	encode: (value, _messageName) =>
		Effect.try({
			try: () => ({
				body: stringify(prepareForYaml(value)),
				contentType: YAML_MIME,
			}),
			catch: (e) =>
				new CodecEncodeError({ format: "yaml", message: String(e) }),
		}),

	decode: (body, _messageName) =>
		Effect.try({
			try: () => {
				const text =
					typeof body === "string"
						? body
						: new TextDecoder().decode(body as Uint8Array);
				const doc = parseDocument(text);
				if (doc.errors.length > 0) {
					throw new Error(doc.errors.map((e) => e.message).join("; "));
				}
				return restoreFromYaml(doc.toJS());
			},
			catch: (e) =>
				new CodecDecodeError({ format: "yaml", message: String(e) }),
		}),
});
