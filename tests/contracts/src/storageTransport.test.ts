import { createJsonFileTransport } from "@morphdsl/storage-jsonfile-impls";
import { createMemoryTransport } from "@morphdsl/storage-memory-impls";
import { createSqliteTransport } from "@morphdsl/storage-sqlite-impls";
import { Database } from "bun:sqlite";
import { afterEach, describe, test } from "bun:test";
import { Effect } from "effect";
import * as fc from "fast-check";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { storageTransportContracts } from "./storageTransport.contracts";

describe("StorageTransport contracts", () => {
	describe("memory", () => {
		const suites = storageTransportContracts(() => createMemoryTransport());
		for (const suite of suites) {
			test(suite.name, async () => {
				await fc.assert(fc.asyncProperty(suite.arbitrary, async (input: any) => suite.law(input)));
			});
		}
	});
	describe("jsonfile", () => {
		let tempDir: string;

		afterEach(() => {
			if (tempDir) rmSync(tempDir, { recursive: true, force: true });
		});

		const suites = storageTransportContracts(() => {
			tempDir = mkdtempSync(join(tmpdir(), "storage-jsonfile-"));
			const filePath = join(tempDir, "store.json");
			return Effect.succeed(createJsonFileTransport(filePath, "test"));
		});
		for (const suite of suites) {
			test(suite.name, async () => {
				await fc.assert(fc.asyncProperty(suite.arbitrary, async (input: any) => suite.law(input)));
			});
		}
	});
	describe("sqlite", () => {
		const suites = storageTransportContracts(() => {
			const db = new Database(":memory:");
			return Effect.succeed(createSqliteTransport(db, "test_store"));
		});
		for (const suite of suites) {
			test(suite.name, async () => {
				await fc.assert(fc.asyncProperty(suite.arbitrary, async (input: any) => suite.law(input)));
			});
		}
	});
});
