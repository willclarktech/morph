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

/**
 * Append prose re-exports so generated tests can import `prose` from core.
 * The default prose generator writes `contexts/<ctx>/dsl/src/prose.ts`; this
 * function makes sure DSL and core indexes re-export it and that core has a
 * `prose.ts` shim that pulls from the DSL package.
 */
const wireProseForContext = (
	files: GeneratedFile[],
	projectName: string,
	contextName: string,
	scope: string,
): void => {
	const dslIndexPath = `${projectName}/contexts/${contextName}/dsl/src/index.ts`;
	const coreIndexPath = `${projectName}/contexts/${contextName}/core/src/index.ts`;
	const corePoseFilePath = `${projectName}/contexts/${contextName}/core/src/prose.ts`;
	const dslPackageName = `@${scope}/${contextName}-dsl`;

	const updateContent = (filename: string, suffix: string): void => {
		const index = files.findIndex((f) => f.filename === filename);
		if (index === -1) return;
		const existing = files[index];
		if (!existing || existing.content.includes("./prose")) return;
		files[index] = {
			...existing,
			content: existing.content.trimEnd() + suffix,
		};
	};

	updateContent(
		dslIndexPath,
		'\n\n// Prose (hand-written fixture)\nexport { prose } from "./prose";\n',
	);
	updateContent(
		coreIndexPath,
		'\n\n// Prose (re-exported from DSL)\nexport * from "./prose";\n',
	);

	files.push({
		filename: corePoseFilePath,
		content: `// Re-export prose from DSL\n\nexport { prose } from "${dslPackageName}";\n`,
	});
};

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

			// Always write the parsed schema as schema.json — generated files import
			// from `../../../../schema.json` regardless of source format. If the input
			// was a .morph file, also preserve it alongside the JSON for human readers.
			const isMorph = !schemaText.trimStart().startsWith("{");
			if (isMorph) {
				files.push({
					content: schemaText,
					filename: `${name}/schema.morph`,
				});
			}
			files.push({
				content: JSON.stringify(schema, undefined, "\t") + "\n",
				filename: `${name}/schema.json`,
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

			// Wire prose into each context's DSL/core: DSL re-exports its prose.ts,
			// core gets a prose.ts that re-exports from the DSL package, and core's
			// index re-exports prose. Mirrors what scripts/generate-examples.ts does
			// for the bundled examples.
			const scope = name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
			for (const contextName of Object.keys(schema.contexts)) {
				wireProseForContext(files, name, contextName, scope);
			}

			return { files: postProcessFiles(files, options) };
		}),
});
