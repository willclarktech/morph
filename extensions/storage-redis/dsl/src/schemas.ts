// Generated from DomainSchema: Morph
// Do not edit manually

// Effect/Schema Definitions

import * as S from "effect/Schema";

// Pure Type Schemas (transformation-centric)

// Redis connection statistics
export const ConnectionInfoSchema = S.Struct({
	url: S.String,
	connected: S.Boolean,
	memoryUsageBytes: S.Number,
	keyCount: S.Number,
});

export type ConnectionInfo = S.Schema.Type<typeof ConnectionInfoSchema>;

export const parseConnectionInfo = S.decodeUnknownSync(ConnectionInfoSchema);
export const parseConnectionInfoEither =
	S.decodeUnknownEither(ConnectionInfoSchema);
export const encodeConnectionInfo = S.encodeSync(ConnectionInfoSchema);

// Function Schemas (pure transformations)

import type { ConnectionFailedError, ConnectionTimeoutError } from "./errors";

// Establish a connection to a Redis server
export const ConnectInputSchema = S.Struct({
	url: S.optional(S.String),
});

export type ConnectInput = S.Schema.Type<typeof ConnectInputSchema>;
export type ConnectOutput = ConnectionInfo;
export type ConnectError = ConnectionFailedError | ConnectionTimeoutError;

// Get current Redis connection statistics
export const GetConnectionInfoInputSchema = S.Struct({});

export type GetConnectionInfoInput = S.Schema.Type<
	typeof GetConnectionInfoInputSchema
>;
export type GetConnectionInfoOutput = ConnectionInfo;
export type GetConnectionInfoError = ConnectionFailedError;
