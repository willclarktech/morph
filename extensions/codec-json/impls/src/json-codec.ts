import { Effect } from "effect";

import type { Codec } from "@morph/codec-dsl";
import { CodecDecodeError, CodecEncodeError } from "@morph/codec-dsl";
import { jsonParse, jsonStringify } from "@morph/utils";

export const createJsonCodec = (): Codec => ({
	format: "json",
	mimeContribution: {
		format: "json",
		mimeTypes: ["application/json"],
	},

	encode: (value, _messageName) =>
		Effect.try({
			try: () => ({
				body: jsonStringify(value),
				contentType: "application/json" as const,
			}),
			catch: (e) =>
				new CodecEncodeError({ format: "json", message: String(e) }),
		}),

	decode: (body, _messageName) =>
		Effect.try({
			try: () =>
				jsonParse(
					typeof body === "string"
						? body
						: new TextDecoder().decode(body as Uint8Array),
				),
			catch: (e) =>
				new CodecDecodeError({ format: "json", message: String(e) }),
		}),
});
