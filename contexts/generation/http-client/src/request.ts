import { Effect } from "effect";

import { HttpClientError } from "./error";

class HttpResponseError extends Error {
	readonly status: number;
	readonly body: Record<string, unknown>;
	constructor(status: number, body: Record<string, unknown>) {
		super(`HTTP ${status}`);
		this.status = status;
		this.body = body;
	}
}

export const request = <T>(
	url: string,
	init?: RequestInit,
): Effect.Effect<T, HttpClientError> =>
	Effect.tryPromise({
		try: async () => {
			const response = await fetch(url, init);
			if (!response.ok) {
				const errorBody = (await response.json().catch(() => ({}))) as Record<
					string,
					unknown
				>;
				throw new HttpResponseError(response.status, errorBody);
			}
			return (await response.json()) as T;
		},
		catch: (error) => {
			if (error instanceof HttpResponseError) {
				const body = error.body;
				if (body["_tag"]) {
					return {
						_tag: body["_tag"],
						message: (body["message"] as string | undefined) ?? "Unknown error",
					} as never;
				}
				return new HttpClientError({
					message: (body["message"] as string | undefined) ?? "Request failed",
					status: error.status,
					cause: error,
				});
			}
			const error_ = error as { message?: string };
			return new HttpClientError({
				message: error_.message ?? "Request failed",
				cause: error,
			});
		},
	});
