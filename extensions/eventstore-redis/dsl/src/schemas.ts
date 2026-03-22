// Generated from DomainSchema: Morph
// Do not edit manually

// Effect/Schema Definitions

import * as S from "effect/Schema";

// Pure Type Schemas (transformation-centric)

// Redis event store connection statistics
export const RedisEventStoreInfoSchema = S.Struct({
	connected: S.Boolean,
	eventCount: S.Number,
	url: S.String,
});

export type RedisEventStoreInfo = S.Schema.Type<
	typeof RedisEventStoreInfoSchema
>;

export const parseRedisEventStoreInfo = S.decodeUnknownSync(
	RedisEventStoreInfoSchema,
);
export const parseRedisEventStoreInfoEither = S.decodeUnknownEither(
	RedisEventStoreInfoSchema,
);
export const encodeRedisEventStoreInfo = S.encodeSync(
	RedisEventStoreInfoSchema,
);

// Function Schemas (pure transformations)

// Establish a connection to a Redis event store
export const ConnectInputSchema = S.Struct({
	url: S.optional(S.String),
});

export type ConnectInput = S.Schema.Type<typeof ConnectInputSchema>;
export type ConnectOutput = RedisEventStoreInfo;

// Get current Redis event store connection statistics
export const GetConnectionInfoInputSchema = S.Struct({});

export type GetConnectionInfoInput = S.Schema.Type<
	typeof GetConnectionInfoInputSchema
>;
export type GetConnectionInfoOutput = RedisEventStoreInfo;
