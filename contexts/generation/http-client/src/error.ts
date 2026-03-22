import { Data } from "effect";

export class HttpClientError extends Data.TaggedError("HttpClientError")<{
	readonly message: string;
	readonly status?: number | undefined;
	readonly cause?: unknown;
}> {}
