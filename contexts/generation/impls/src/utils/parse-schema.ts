import type { DomainSchema } from "@morph/domain-schema";

import { parseSchema } from "@morph/domain-schema";
import { InvalidSchemaError } from "@morph/generation-dsl";
import { compile } from "@morph/schema-dsl-compiler";
import { parse } from "@morph/schema-dsl-parser";
import { Effect } from "effect";

const parseSchemaFromJson = (
	json: string,
): Effect.Effect<DomainSchema, InvalidSchemaError> =>
	Effect.gen(function* () {
		let rawSchema: unknown;
		try {
			rawSchema = JSON.parse(json);
		} catch {
			return yield* Effect.fail(
				new InvalidSchemaError({
					message: "Invalid JSON: could not parse schema input",
				}),
			);
		}
		try {
			return parseSchema(rawSchema);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return yield* Effect.fail(
				new InvalidSchemaError({ message: `Invalid schema: ${message}` }),
			);
		}
	});

const parseSchemaFromMorph = (
	source: string,
): Effect.Effect<DomainSchema, InvalidSchemaError> =>
	Effect.gen(function* () {
		const parseResult = parse(source);
		if (parseResult.errors.length > 0) {
			const msgs = parseResult.errors
				.map(
					(diagnostic) =>
						`Line ${diagnostic.range.start.line}:${diagnostic.range.start.column}: ${diagnostic.message}`,
				)
				.join("\n");
			return yield* Effect.fail(
				new InvalidSchemaError({ message: `Parse errors:\n${msgs}` }),
			);
		}

		if (!parseResult.ast) {
			return yield* Effect.fail(
				new InvalidSchemaError({
					message: "Parse succeeded with no errors but produced no AST",
				}),
			);
		}

		const compileResult = compile(parseResult.ast);
		if (compileResult.errors.length > 0) {
			const msgs = compileResult.errors
				.map(
					(diagnostic) =>
						`Line ${diagnostic.range.start.line}:${diagnostic.range.start.column}: ${diagnostic.message}`,
				)
				.join("\n");
			return yield* Effect.fail(
				new InvalidSchemaError({ message: `Compile errors:\n${msgs}` }),
			);
		}

		try {
			return parseSchema(compileResult.schema);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return yield* Effect.fail(
				new InvalidSchemaError({ message: `Invalid schema: ${message}` }),
			);
		}
	});

export const parseSchemaInput = (
	input: string,
): Effect.Effect<DomainSchema, InvalidSchemaError> => {
	const trimmed = input.trimStart();
	if (trimmed.startsWith("{")) {
		return parseSchemaFromJson(input);
	}
	return parseSchemaFromMorph(input);
};
