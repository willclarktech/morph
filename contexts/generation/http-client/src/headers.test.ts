import { describe, expect, test } from "bun:test";

import { authHeaders, jsonHeaders } from "./headers";

describe("authHeaders", () => {
	test("returns empty object without token", () => {
		expect(authHeaders()).toEqual({});
	});

	test("returns empty object with undefined token", () => {
		expect(authHeaders(undefined)).toEqual({});
	});

	test("returns Authorization header with token", () => {
		expect(authHeaders("my-token")).toEqual({
			Authorization: "Bearer my-token",
		});
	});
});

describe("jsonHeaders", () => {
	test("returns JSON Content-Type and Accept without token", () => {
		expect(jsonHeaders()).toEqual({
			Accept: "application/json",
			"Content-Type": "application/json",
		});
	});

	test("returns JSON Content-Type/Accept and Authorization with token", () => {
		expect(jsonHeaders("my-token")).toEqual({
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: "Bearer my-token",
		});
	});

	test("uses YAML MIME type when format is yaml", () => {
		expect(jsonHeaders(undefined, "yaml")).toEqual({
			Accept: "application/x-yaml",
			"Content-Type": "application/x-yaml",
		});
	});

	test("uses protobuf MIME type when format is protobuf", () => {
		expect(jsonHeaders("token", "protobuf")).toEqual({
			Accept: "application/x-protobuf",
			"Content-Type": "application/x-protobuf",
			Authorization: "Bearer token",
		});
	});

	test("falls back to JSON for unknown format", () => {
		expect(jsonHeaders(undefined, "unknown")).toEqual({
			Accept: "application/json",
			"Content-Type": "application/json",
		});
	});
});
