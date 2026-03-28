import { expect, test } from "bun:test";

import { sortImports } from "./imports";

test("sorts type imports before external imports", () => {
	const input = `import { Effect } from "effect";
import type { Context } from "@morph/core";`;

	const result = sortImports(input);

	expect(result).toBe(`import type { Context } from "@morph/core";

import { Effect } from "effect";`);
});

test("sorts external imports alphabetically", () => {
	const input = `import { Effect } from "effect";
import { createCli } from "@morph/runtime-cli";
import { Data } from "effect/Data";
import { HandlersLayer } from "@morph/generation-core";`;

	const result = sortImports(input);

	expect(result).toBe(`import { HandlersLayer } from "@morph/generation-core";
import { createCli } from "@morph/runtime-cli";
import { Effect } from "effect";
import { Data } from "effect/Data";`);
});

test("sorts relative imports alphabetically after external", () => {
	const input = `import { foo } from "./foo";
import { Effect } from "effect";
import { bar } from "./bar";`;

	const result = sortImports(input);

	expect(result).toBe(`import { Effect } from "effect";

import { bar } from "./bar";
import { foo } from "./foo";`);
});

test("handles multi-line imports", () => {
	const input = `import {
	createCli,
	filterBackendArgument,
} from "@morph/runtime-cli";
import { Effect } from "effect";`;

	const result = sortImports(input);

	expect(result).toBe(`import {
	createCli,
	filterBackendArgument,
} from "@morph/runtime-cli";
import { Effect } from "effect";`);
});

test("preserves all three groups with blank line separators", () => {
	const input = `import { foo } from "./foo";
import { Effect } from "effect";
import type { Bar } from "@morph/core";`;

	const result = sortImports(input);

	expect(result).toBe(`import type { Bar } from "@morph/core";

import { Effect } from "effect";

import { foo } from "./foo";`);
});

test("handles empty input", () => {
	expect(sortImports("")).toBe("");
});

test("handles single import", () => {
	const input = `import { Effect } from "effect";`;
	expect(sortImports(input)).toBe(input);
});
