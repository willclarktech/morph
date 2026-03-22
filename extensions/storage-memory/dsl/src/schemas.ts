// Generated from DomainSchema: Morph
// Do not edit manually

// Effect/Schema Definitions

import * as S from "effect/Schema";

// Pure Type Schemas (transformation-centric)

// Statistics about the in-memory store
export const MemoryStoreInfoSchema = S.Struct({
	entryCount: S.Number,
	collectionCount: S.Number,
});

export type MemoryStoreInfo = S.Schema.Type<typeof MemoryStoreInfoSchema>;

export const parseMemoryStoreInfo = S.decodeUnknownSync(MemoryStoreInfoSchema);
export const parseMemoryStoreInfoEither = S.decodeUnknownEither(
	MemoryStoreInfoSchema,
);
export const encodeMemoryStoreInfo = S.encodeSync(MemoryStoreInfoSchema);

// Function Schemas (pure transformations)

// Get current statistics about the in-memory store
export const GetStoreInfoInputSchema = S.Struct({});

export type GetStoreInfoInput = S.Schema.Type<typeof GetStoreInfoInputSchema>;
export type GetStoreInfoOutput = MemoryStoreInfo;

// Clear all data from the in-memory store (dev/test)
export const ResetStoreInputSchema = S.Struct({});

export type ResetStoreInput = S.Schema.Type<typeof ResetStoreInputSchema>;
export type ResetStoreOutput = void;
