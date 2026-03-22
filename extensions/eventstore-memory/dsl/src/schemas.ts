// Generated from DomainSchema: Morph
// Do not edit manually

// Effect/Schema Definitions

import * as S from "effect/Schema";

// Pure Type Schemas (transformation-centric)

// Statistics about the in-memory event store
export const MemoryEventStoreInfoSchema = S.Struct({
	eventCount: S.Number,
	tagCount: S.Number,
});

export type MemoryEventStoreInfo = S.Schema.Type<
	typeof MemoryEventStoreInfoSchema
>;

export const parseMemoryEventStoreInfo = S.decodeUnknownSync(
	MemoryEventStoreInfoSchema,
);
export const parseMemoryEventStoreInfoEither = S.decodeUnknownEither(
	MemoryEventStoreInfoSchema,
);
export const encodeMemoryEventStoreInfo = S.encodeSync(
	MemoryEventStoreInfoSchema,
);

// Function Schemas (pure transformations)

// Get current statistics about the in-memory event store
export const GetStoreInfoInputSchema = S.Struct({});

export type GetStoreInfoInput = S.Schema.Type<typeof GetStoreInfoInputSchema>;
export type GetStoreInfoOutput = MemoryEventStoreInfo;

// Clear all events from the in-memory store (dev/test)
export const ResetStoreInputSchema = S.Struct({});

export type ResetStoreInput = S.Schema.Type<typeof ResetStoreInputSchema>;
export type ResetStoreOutput = void;
