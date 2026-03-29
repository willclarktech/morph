// Port (DI contract) definitions
// Do not edit - regenerate from schema

import type { Effect } from "effect";

import { Context } from "effect";

import type {
	CodecDecodeError,
	CodecEncodeError,
	CodecNegotiationError,
} from "./errors";
import type { EncodeResult, MimeContribution } from "./schemas";

/**
 * Encode and decode values in a specific wire format.
 * Each codec implementation contributes its own MIME types.
 */
export interface Codec {
	readonly format: string;
	readonly mimeContribution: MimeContribution;

	readonly encode: (
		value: unknown,
		messageName: string,
	) => Effect.Effect<EncodeResult, CodecEncodeError>;

	readonly decode: (
		body: unknown,
		messageName: string,
	) => Effect.Effect<unknown, CodecDecodeError>;
}

/**
 * Context tag for Codec dependency injection.
 */
export const Codec = Context.GenericTag<Codec>("@morphdsl/Codec");

/**
 * Composite registry with content negotiation.
 * Composes multiple Codec instances and selects the appropriate one
 * based on Accept/Content-Type headers.
 */
export interface CodecRegistry {
	readonly get: (format: string) => Effect.Effect<Codec, CodecNegotiationError>;

	readonly negotiate: (
		acceptHeader: string,
	) => Effect.Effect<Codec, CodecNegotiationError>;

	readonly fromContentType: (
		contentType: string,
	) => Effect.Effect<Codec, CodecNegotiationError>;

	readonly getAvailableFormats: () => Effect.Effect<
		readonly MimeContribution[]
	>;
}

/**
 * Context tag for CodecRegistry dependency injection.
 */
export const CodecRegistry = Context.GenericTag<CodecRegistry>(
	"@morphdsl/CodecRegistry",
);
