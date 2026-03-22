// Generated from DomainSchema: Codec
// Do not edit manually

// Effect/Schema Definitions

import * as S from "effect/Schema";

// Result of encoding a value
export const EncodeResultSchema = S.Struct({
	body: S.Unknown,
	contentType: S.String,
});

export type EncodeResult = S.Schema.Type<typeof EncodeResultSchema>;

// MIME types contributed by a codec
export const MimeContributionSchema = S.Struct({
	format: S.String,
	mimeTypes: S.Array(S.String),
});

export type MimeContribution = S.Schema.Type<typeof MimeContributionSchema>;
