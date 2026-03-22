import { Effect } from "effect";
import protobuf from "protobufjs";

import type { Codec } from "@morph/codec-dsl";
import { CodecDecodeError, CodecEncodeError } from "@morph/codec-dsl";

const PROTOBUF_MIME = "application/x-protobuf";

export interface ProtobufCodecConfig {
	readonly root: protobuf.Root;
	readonly messageMapping: Readonly<
		Record<string, { readonly input: string; readonly output: string }>
	>;
	readonly dateFields?: Readonly<Record<string, readonly string[]>>;
}

const timestampToDate = (ts: {
	seconds?: number | bigint;
	nanos?: number;
}): Date => {
	const seconds =
		typeof ts.seconds === "bigint" ? Number(ts.seconds) : (ts.seconds ?? 0);
	const nanos = ts.nanos ?? 0;
	return new Date(seconds * 1000 + nanos / 1e6);
};

const dateToTimestamp = (date: Date): { seconds: bigint; nanos: number } => {
	const ms = date.getTime();
	const seconds = BigInt(Math.floor(ms / 1000));
	const nanos = (ms % 1000) * 1e6;
	return { seconds, nanos };
};

const coerceDateFields = (
	obj: Record<string, unknown>,
	dateFieldNames: readonly string[],
	toDate: boolean,
): Record<string, unknown> => {
	const result = { ...obj };
	for (const field of dateFieldNames) {
		const value = result[field];
		if (value === undefined || value === null) continue;
		if (toDate && typeof value === "object") {
			result[field] = timestampToDate(
				value as { seconds?: number | bigint; nanos?: number },
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
				const msgTypeName = mapping?.output ?? messageName;
				const MessageType = config.root.lookupType(msgTypeName);

				let payload = value as Record<string, unknown>;
				const dateFieldNames = config.dateFields?.[msgTypeName] ?? [];
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
			catch: (e) =>
				new CodecEncodeError({ format: "protobuf", message: String(e) }),
		}),

	decode: (body, messageName) =>
		Effect.try({
			try: () => {
				const mapping = config.messageMapping[messageName];
				const msgTypeName = mapping?.input ?? messageName;
				const MessageType = config.root.lookupType(msgTypeName);

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

				const dateFieldNames = config.dateFields?.[msgTypeName] ?? [];
				if (dateFieldNames.length > 0) {
					result = coerceDateFields(result, dateFieldNames, true);
				}

				return result;
			},
			catch: (e) =>
				new CodecDecodeError({ format: "protobuf", message: String(e) }),
		}),
});
