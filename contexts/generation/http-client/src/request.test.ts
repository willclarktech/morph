import { describe, expect, mock, test } from "bun:test";

import { Effect } from "effect";

import { request } from "./request";

const mockFetch = (response: Response) => {
	globalThis.fetch = mock(() =>
		Promise.resolve(response),
	) as unknown as typeof fetch;
};

const mockFetchReject = (error: Error) => {
	globalThis.fetch = mock(() =>
		Promise.reject(error),
	) as unknown as typeof fetch;
};

describe("request", () => {
	test("returns parsed JSON on success", async () => {
		mockFetch(
			new Response(JSON.stringify({ id: 1, name: "test" }), { status: 200 }),
		);
		const result = await Effect.runPromise(
			request<{ id: number; name: string }>("http://example.com/api"),
		);
		expect(result).toEqual({ id: 1, name: "test" });
	});

	test("returns HttpClientError on HTTP error without _tag", async () => {
		mockFetch(
			new Response(JSON.stringify({ message: "Not found" }), { status: 404 }),
		);
		const result = await Effect.runPromiseExit(
			request("http://example.com/api"),
		);
		expect(result._tag).toBe("Failure");
		if (result._tag === "Failure") {
			const error = result.cause;
			expect(JSON.stringify(error)).toContain("Not found");
		}
	});

	test("returns domain error when response has _tag", async () => {
		mockFetch(
			new Response(
				JSON.stringify({
					_tag: "TodoNotFoundError",
					message: "Todo not found",
				}),
				{ status: 404 },
			),
		);
		const result = await Effect.runPromiseExit(
			request("http://example.com/api"),
		);
		expect(result._tag).toBe("Failure");
	});

	test("returns HttpClientError on network error", async () => {
		mockFetchReject(new Error("Network failure"));
		const result = await Effect.runPromiseExit(
			request("http://example.com/api"),
		);
		expect(result._tag).toBe("Failure");
	});

	test("handles non-JSON error response", async () => {
		mockFetch(
			new Response("Internal Server Error", {
				status: 500,
				headers: { "Content-Type": "text/plain" },
			}),
		);
		const result = await Effect.runPromiseExit(
			request("http://example.com/api"),
		);
		expect(result._tag).toBe("Failure");
	});

	test("passes RequestInit to fetch", async () => {
		mockFetch(new Response(JSON.stringify({}), { status: 200 }));
		await Effect.runPromise(
			request("http://example.com/api", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "test" }),
			}),
		);
		expect(globalThis.fetch).toHaveBeenCalledWith("http://example.com/api", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "test" }),
		});
	});
});
