import type { Codec, CodecRegistry } from "@morph/codec-dsl";

import { CodecNegotiationError } from "@morph/codec-dsl";
import { Effect } from "effect";

import { negotiateMime } from "./negotiation";

export const createCodecRegistry = (
	codecs: readonly Codec[],
	defaultFormat: string,
): CodecRegistry => {
	// Build format→codec map
	const formatMap = new Map<string, Codec>();
	// Build mime→format map (for negotiation lookups)
	const mimeToFormat = new Map<string, string>();
	// Build mime→codec map (for direct Content-Type lookups)
	const mimeMap = new Map<string, Codec>();

	for (const codec of codecs) {
		formatMap.set(codec.format, codec);
		for (const mime of codec.mimeContribution.mimeTypes) {
			mimeToFormat.set(mime, codec.format);
			mimeMap.set(mime, codec);
		}
	}

	const availableFormats = codecs.map((c) => c.mimeContribution);
	const allFormatNames = codecs.map((c) => c.format);

	return {
		get: (format) => {
			const codec = formatMap.get(format);
			if (codec) return Effect.succeed(codec);
			return Effect.fail(
				new CodecNegotiationError({
					requested: format,
					available: allFormatNames,
				}),
			);
		},

		negotiate: (acceptHeader) => {
			const format = negotiateMime(acceptHeader, mimeToFormat, defaultFormat);
			if (format !== undefined) {
				const codec = formatMap.get(format);
				if (codec) return Effect.succeed(codec);
			}
			return Effect.fail(
				new CodecNegotiationError({
					requested: acceptHeader,
					available: allFormatNames,
				}),
			);
		},

		fromContentType: (contentType) => {
			// Strip parameters (e.g., "application/json; charset=utf-8" → "application/json")
			const [mimeRaw = ""] = contentType.split(";");
			const mime = mimeRaw.trim();
			const codec = mimeMap.get(mime);
			if (codec) return Effect.succeed(codec);
			return Effect.fail(
				new CodecNegotiationError({
					requested: contentType,
					available: allFormatNames,
				}),
			);
		},

		getAvailableFormats: () => Effect.succeed(availableFormats),
	};
};
