import type { GeneratedFile } from "@morphdsl/domain-schema";
import type {
	GenerationResult,
	InvalidSchemaError,
} from "@morphdsl/generation-dsl";
import type { Effect } from "effect";

import {
	generateDefaultProse,
	init as scaffoldInit,
} from "@morphdsl/builder-scaffold";
import { Context, Effect as E, Layer } from "effect";

import type { GenerateOptions } from "./generate";

import { executeGenerate, postProcessFiles } from "./generate";
import { parseSchemaInput } from "./utils";

export type NewProjectOptions = GenerateOptions;

export interface NewProjectHandler {
	readonly handle: (
		params: { readonly name: string; readonly schema: string },
		options: NewProjectOptions,
	) => Effect.Effect<GenerationResult, InvalidSchemaError>;
}

export const NewProjectHandler = Context.GenericTag<NewProjectHandler>(
	"@morphdsl/impls/NewProjectHandler",
);

export const NewProjectHandlerLive = Layer.succeed(NewProjectHandler, {
	handle: (params, options) =>
		E.gen(function* () {
			const { name, schema: schemaText } = params;
			const schema = yield* parseSchemaInput(schemaText);

			const files: GeneratedFile[] = [];

			const scaffold = yield* E.promise(() => scaffoldInit({ name }));
			files.push(
				...scaffold.files.map((f) => ({
					...f,
					filename: `${name}/${f.filename}`,
				})),
			);

			const isMorph = !schemaText.trimStart().startsWith("{");
			files.push({
				content: isMorph
					? schemaText
					: JSON.stringify(JSON.parse(schemaText), undefined, "\t") + "\n",
				filename: `${name}/${isMorph ? "schema.morph" : "schema.json"}`,
			});

			const generated = yield* executeGenerate(schema, name, {
				...(options.textConfig && { textConfig: options.textConfig }),
				...(options.uiConfig && { uiConfig: options.uiConfig }),
			});
			files.push(
				...generated.files.map((f) => ({
					...f,
					filename: `${name}/${f.filename}`,
				})),
			);

			const proseFiles = generateDefaultProse(schema);
			for (const proseFile of Object.values(proseFiles)) {
				files.push({
					...proseFile,
					filename: `${name}/${proseFile.filename}`,
					scaffold: true,
				});
			}

			return { files: postProcessFiles(files, options) };
		}),
});
