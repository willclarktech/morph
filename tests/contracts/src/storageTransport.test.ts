import { describe, test, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as fc from "fast-check";
import { Effect } from "effect";

import { storageTransportContracts } from "./storageTransport.contracts";
import { createMemoryTransport } from "@morph/storage-memory-impls";
import { createJsonFileTransport } from "@morph/storage-jsonfile-impls";
import { createSqliteTransport } from "@morph/storage-sqlite-impls";

describe("StorageTransport contracts", () => {
	describe("memory", () => {
		const suites = storageTransportContracts(() => createMemoryTransport());
		for (const suite of suites) {
			test(suite.name, async () => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				await fc.assert(fc.asyncProperty(suite.arbitrary, async (input: any) => suite.law(input)));
			});
		}
	});
});
