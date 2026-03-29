import type { Codec } from "@morphdsl/codec-dsl";
import type protobuf from "protobufjs";

import { CodecDecodeError, CodecEncodeError } from "@morphdsl/codec-dsl";
import { Effect } from "effect";

const PROTOBUF_MIME = "application/x-protobuf";

export interface ProtobufCodecConfig {
	readonly root: protobuf.Root;
	readonly messageMapping: Readonly<
		Record<string, { readonly input: string; readonly output: string }>
	>;
	readonly dateFields?: Readonly<Record<string, readonly string[]>>;
}

const timestampToDate = (ts: {
	nanos?: number;
	seconds?: number | bigint;
}): Date => {
	const seconds =
		typeof ts.seconds === "bigint" ? Number(ts.seconds) : (ts.seconds ?? 0);
	const nanos = ts.nanos ?? 0;
	return new Date(seconds * 1000 + nanos / 1e6);
};

const dateToTimestamp = (date: Date): { nanos: number; seconds: bigint } => {
	const ms = date.getTime();
	const seconds = BigInt(Math.floor(ms / 1000));
	const nanos = (ms % 1000) * 1e6;
	return { seconds, nanos };
};

const coerceDateFields = (
	object: Record<string, unknown>,
	dateFieldNames: readonly string[],
	toDate: boolean,
): Record<string, unknown> => {
	const result = { ...object };
	for (const field of dateFieldNames) {
		const value = result[field];
		if (value === undefined || value === null) continue;
		if (toDate && typeof value === "object") {
			result[field] = timestampToDate(
				value as { nanos?: number; seconds?: number | bigint },
			);
		} else if (!toDate && value instanceof Date) {
			result[field] = dateToTimestamp(value);
		}
	}
	return result;
};

export const createProtobufCodec = (config: ProtobufCodecConfig): Codec => ({
	format: "protobuf",
	mimeContribution: {
		format: "protobuf",
		mimeTypes: [PROTOBUF_MIME, "application/protobuf"],
	},

	encode: (value, messageName) =>
		Effect.try({
			try: () => {
				const mapping = config.messageMapping[messageName];
				const messageTypeName = mapping?.output ?? messageName;
				const MessageType = config.root.lookupType(messageTypeName);

				let payload = value as Record<string, unknown>;
				const dateFieldNames = config.dateFields?.[messageTypeName] ?? [];
				if (dateFieldNames.length > 0) {
					payload = coerceDateFields(payload, dateFieldNames, false);
				}

				const message = MessageType.create(payload);
				const buffer = MessageType.encode(message).finish();
				return {
					body: buffer,
					contentType: PROTOBUF_MIME,
				};
			},
			catch: (error) =>
				new CodecEncodeError({ format: "protobuf", message: String(error) }),
		}),

	decode: (body, messageName) =>
		Effect.try({
			try: () => {
				const mapping = config.messageMapping[messageName];
				const messageTypeName = mapping?.input ?? messageName;
				const MessageType = config.root.lookupType(messageTypeName);

				const bytes =
					body instanceof Uint8Array
						? body
						: typeof body === "string"
							? new TextEncoder().encode(body)
							: new Uint8Array(body as ArrayBuffer);

				const decoded = MessageType.decode(bytes);
				let result = MessageType.toObject(decoded, {
					longs: String,
					defaults: true,
				}) as Record<string, unknown>;

				const dateFieldNames = config.dateFields?.[messageTypeName] ?? [];
				if (dateFieldNames.length > 0) {
					result = coerceDateFields(result, dateFieldNames, true);
				}

				return result;
			},
			catch: (error) =>
				new CodecDecodeError({ format: "protobuf", message: String(error) }),
		}),
});
