import type { DomainSchema } from "@morph/domain-schema";

import { getAllEntities } from "@morph/domain-schema";
import { sortImports } from "@morph/utils";

import type { ContextPackages } from "./imports";

interface SeedOptions {
	readonly contexts: readonly ContextPackages[];
	readonly schema: DomainSchema;
}

export const generateSeedFile = (options: SeedOptions): string | undefined => {
	const { schema, contexts } = options;
	const entities = getAllEntities(schema);

	if (entities.length === 0) return undefined;

	const entitiesByContext = new Map<string, string[]>();
	for (const entity of entities) {
		const existing = entitiesByContext.get(entity.context) ?? [];
		existing.push(entity.name);
		entitiesByContext.set(entity.context, existing);
	}

	const importLines: string[] = [
		'import * as fc from "fast-check";',
		'import { Effect } from "effect";',
	];

	for (const ctx of contexts) {
		const contextEntities = entitiesByContext.get(ctx.contextName) ?? [];
		if (contextEntities.length === 0) continue;

		const arbitraryImports = contextEntities.map((name) => `${name}Arbitrary`);
		importLines.push(
			`import { ${arbitraryImports.join(", ")} } from "${ctx.dslPackage}";`,
		);

		const repoImports = contextEntities.map((name) => `${name}Repository`);
		importLines.push(
			`import { ${repoImports.join(", ")} } from "${ctx.corePackage}";`,
		);
	}

	const imports = sortImports(importLines.join("\n"));

	const seedSteps = entities.map((entity) => {
		const lower = entity.name.charAt(0).toLowerCase() + entity.name.slice(1);
		return [
			`\tconst ${lower}s = fc.sample(${entity.name}Arbitrary, { numRuns: count, seed: seedValue });`,
			`\tconst ${lower}Repo = yield* ${entity.name}Repository;`,
			`\tfor (const item of ${lower}s) {`,
			`\t\tyield* ${lower}Repo.save(item);`,
			`\t}`,
			`\tconsole.info(\`Seeded \${${lower}s.length} ${lower}s\`);`,
		].join("\n");
	});

	return `${imports}

export const parseSeedArgs = (argv: readonly string[]) => {
	const countIdx = argv.indexOf("--count");
	const count =
		countIdx >= 0 && argv[countIdx + 1] !== undefined
			? Number(argv[countIdx + 1])
			: 10;
	const seedIdx = argv.indexOf("--seed");
	const seedValue =
		seedIdx >= 0 && argv[seedIdx + 1] !== undefined
			? Number(argv[seedIdx + 1])
			: 42;
	return { count, seedValue };
};

export const runSeed = (count: number, seedValue: number) =>
	Effect.gen(function* () {
${seedSteps.join("\n\n")}
	});
`;
};
