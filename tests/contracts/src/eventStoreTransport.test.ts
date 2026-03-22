import { describe, test, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as fc from "fast-check";
import { Effect } from "effect";

import { eventStoreTransportContracts } from "./eventStoreTransport.contracts";
import { createMemoryEventStoreTransport } from "@morph/eventstore-memory-impls";
import { createJsonFileEventStoreTransport } from "@morph/eventstore-jsonfile-impls";

describe("EventStoreTransport contracts", () => {
	describe("memory", () => {
		const suites = eventStoreTransportContracts(() => createMemoryEventStoreTransport());
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

		const suites = eventStoreTransportContracts(() => {
			tempDir = mkdtempSync(join(tmpdir(), "eventstore-jsonfile-"));
			const filePath = join(tempDir, "events.json");
			return Effect.succeed(createJsonFileEventStoreTransport(filePath));
		});
		for (const suite of suites) {
			test(suite.name, async () => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				await fc.assert(fc.asyncProperty(suite.arbitrary, async (input: any) => suite.law(input)));
			});
		}
	});
});
