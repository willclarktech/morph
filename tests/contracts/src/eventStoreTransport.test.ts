import { createJsonFileEventStoreTransport } from "@morph/eventstore-jsonfile-impls";
import { createMemoryEventStoreTransport } from "@morph/eventstore-memory-impls";
import { afterEach, describe, test } from "bun:test";
import { Effect } from "effect";
import * as fc from "fast-check";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { eventStoreTransportContracts } from "./eventStoreTransport.contracts";

describe("EventStoreTransport contracts", () => {
	describe("memory", () => {
		const suites = eventStoreTransportContracts(() => createMemoryEventStoreTransport());
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

		const suites = eventStoreTransportContracts(() => {
			tempDir = mkdtempSync(join(tmpdir(), "eventstore-jsonfile-"));
			const filePath = join(tempDir, "events.json");
			return Effect.succeed(createJsonFileEventStoreTransport(filePath));
		});
		for (const suite of suites) {
			test(suite.name, async () => {
				await fc.assert(fc.asyncProperty(suite.arbitrary, async (input: any) => suite.law(input)));
			});
		}
	});
});
