import { Data } from "effect";

export class HttpClientError extends Data.TaggedError("HttpClientError")<{
	readonly cause?: unknown;
	readonly message: string;
	readonly status?: number | undefined;
}> {}
