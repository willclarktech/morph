import type { GeneratedFile } from "@morphdsl/domain-schema";

import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

interface WriteResult {
	readonly path: string;
	readonly skipped: boolean;
}

class WriteError extends Data.TaggedError("WriteError")<{
	readonly cause: unknown;
	readonly filename: string;
}> {}

// Get the filename from a GeneratedFile, supporting both "filename" and "path" properties
const getFilename = (file: GeneratedFile): string =>
	"filename" in file && typeof file.filename === "string"
		? file.filename
		: (file as unknown as { path: string }).path;

const writeFile = (
	file: GeneratedFile,
	baseDir: string,
): Effect.Effect<WriteResult, WriteError> =>
	Effect.gen(function* () {
		const filename = getFilename(file);
		const fullPath = path.join(baseDir, filename);

		// Skip scaffold files that already exist
		if (file.scaffold && existsSync(fullPath)) {
			yield* Effect.logInfo(`Skipped: ${fullPath} (scaffold exists)`);
			return { path: fullPath, skipped: true };
		}

		yield* Effect.tryPromise({
			catch: (cause) => new WriteError({ cause, filename }),
			try: () => mkdir(path.dirname(fullPath), { recursive: true }),
		});
		yield* Effect.tryPromise({
			catch: (cause) => new WriteError({ cause, filename }),
			try: () => Bun.write(fullPath, file.content),
		});
		yield* Effect.logInfo(`Created: ${fullPath}`);
		return { path: fullPath, skipped: false };
	});

export const writeFiles = (
	files: readonly GeneratedFile[],
	baseDir: string,
): Effect.Effect<readonly string[], WriteError> =>
	Effect.gen(function* () {
		const results = yield* Effect.forEach(
			files,
			(file) => writeFile(file, baseDir),
			{ concurrency: "unbounded" },
		);
		const written = results.filter((r) => !r.skipped);
		const skipped = results.filter((r) => r.skipped);
		yield* Effect.logInfo(
			`Wrote ${written.length} files to ${baseDir}${skipped.length > 0 ? ` (${skipped.length} scaffolds skipped)` : ""}`,
		);
		return results.map((r) => r.path);
	});
