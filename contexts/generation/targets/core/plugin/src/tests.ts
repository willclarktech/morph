import type { DomainSchema } from "@morph/domain-schema";
import {
	conditionReferencesInput,
	getAllInvariants,
	getEntitiesForContext,
	getFunctionsForContext,
	getOperationsForContext,
	schemaHasAuthRequirement,
} from "@morph/domain-schema";

export const generateCoreScenarioTest = (
	schema: DomainSchema,
	scenariosPackage: string,
	dslPackage: string,
	corePackage: string,
	contextName: string,
): string => {
	const allOperations = getOperationsForContext(schema, contextName);
	const functions = getFunctionsForContext(schema, contextName);
	const opNames = allOperations.map((op) => op.name);
	const functionNames = functions.map((f) => f.name);
	const allNames = [...opNames, ...functionNames];
	const hasAuth = schemaHasAuthRequirement(schema);
	const hasEntities = getEntitiesForContext(schema, contextName).length > 0;

	const authImports = hasAuth
		? ", AuthServiceInMemory, AuthStateInMemory, setCurrentUser"
		: "";

	// Operations are accessed via `ops` namespace
	const operationsMap = allNames
		.map((n) => {
			if (hasAuth && n === "createUser") {
				return `\t${n}: (params: unknown) => ops.${n}.execute(params as Parameters<typeof ops.${n}.execute>[0], {}).pipe(
		Effect.tap((user) => setCurrentUser(user)),
	),`;
			}
			return `\t${n}: (params: unknown) => ops.${n}.execute(params as Parameters<typeof ops.${n}.execute>[0], {}),`;
		})
		.join("\n");

	const authLayers = hasAuth
		? `
// Auth layer: AuthServiceInMemory needs AuthState, and setCurrentUser also needs AuthState
const AuthLayer = Layer.mergeAll(
	AuthStateInMemory,
	AuthServiceInMemory.pipe(Layer.provide(AuthStateInMemory)),
);
`
		: "";

	const layerComposition = hasEntities
		? hasAuth
			? `const TestLayer = Layer.mergeAll(
	HandlersLayer.pipe(Layer.provide(InMemoryLayer)),
	InMemoryLayer,
).pipe(Layer.provideMerge(AuthLayer));`
			: `const TestLayer = Layer.mergeAll(
	HandlersLayer.pipe(Layer.provide(InMemoryLayer)),
	InMemoryLayer,
);`
		: hasAuth
			? `const TestLayer = HandlersLayer.pipe(Layer.provideMerge(AuthLayer));`
			: `const TestLayer = HandlersLayer;`;

	const effectImports = hasAuth ? "Effect, Layer" : "Layer";

	// Import ops namespace and infrastructure from core
	const coreImportsString = hasEntities
		? `ops, HandlersLayer, InMemoryLayer${authImports}`
		: `ops, HandlersLayer${authImports}`;

	return `import { createLibraryRunner } from "@morph/scenario-runner-core";
import { ${coreImportsString}, prose } from "${corePackage}";
import { scenarios } from "${scenariosPackage}";
import { expect, test } from "bun:test";
import { ${effectImports} } from "effect";
${authLayers}
${layerComposition}

const operations = {
${operationsMap}
};

const runner = createLibraryRunner({
	layer: TestLayer as Layer.Layer<any>,
	operations,
	prose,
});

test("scenarios", async () => {
	const result = await runner.runAllAndPrint(scenarios);
	expect(result.failed).toBe(0);
});
`;
};

export const generateCorePropertyTest = (
	schema: DomainSchema,
	propertiesPackage: string,
	corePackage: string,
	contextName: string,
): string => {
	const invariants = getAllInvariants(schema);
	const hasAuth = schemaHasAuthRequirement(schema);
	const hasEntities = getEntitiesForContext(schema, contextName).length > 0;

	const validatorInvariants = invariants.filter(
		(entry) =>
			entry.def.scope.kind === "entity" ||
			(entry.def.scope.kind === "context" &&
				!conditionReferencesInput(entry.def.condition)),
	);

	const validatorNames = validatorInvariants.map(
		(entry) => `validate${entry.name}`,
	);

	const validatorImports =
		validatorNames.length > 0 ? validatorNames.join(", ") : "";

	const authImports = hasAuth ? ", AuthServiceInMemory, AuthStateInMemory" : "";

	const validatorsMap = validatorInvariants
		.map((entry) => {
			const name = `validate${entry.name}`;
			return entry.def.scope.kind === "entity"
				? `\t${name}: (input: unknown, context: unknown) => ${name}(input as never, context as never),`
				: `\t${name}: (input: unknown) => ${name}({ currentUser: input } as never),`;
		})
		.join("\n");

	const authLayers = hasAuth
		? `
// Auth layer for property tests
const AuthLayer = Layer.mergeAll(
	AuthStateInMemory,
	AuthServiceInMemory.pipe(Layer.provide(AuthStateInMemory)),
);
`
		: "";

	const layerComposition = hasEntities
		? hasAuth
			? `const TestLayer = Layer.mergeAll(
	HandlersLayer.pipe(Layer.provide(InMemoryLayer)),
	InMemoryLayer,
).pipe(Layer.provideMerge(AuthLayer));`
			: `const TestLayer = Layer.mergeAll(
	HandlersLayer.pipe(Layer.provide(InMemoryLayer)),
	InMemoryLayer,
);`
		: hasAuth
			? `const TestLayer = HandlersLayer.pipe(Layer.provideMerge(AuthLayer));`
			: `const TestLayer = HandlersLayer;`;

	const baseImports =
		validatorImports === ""
			? "HandlersLayer"
			: `${validatorImports}, HandlersLayer`;
	const coreImportsString = hasEntities
		? `${baseImports}, InMemoryLayer${authImports}`
		: `${baseImports}${authImports}`;

	return `import { createPropertyLibraryRunner } from "@morph/property-runner-core";
import { ${coreImportsString} } from "${corePackage}";
import { validatorProperties } from "${propertiesPackage}";
import { expect, test } from "bun:test";
import { Layer } from "effect";
${authLayers}
${layerComposition}

const validators = {
${validatorsMap}
};

const runner = createPropertyLibraryRunner({
	layer: TestLayer as Layer.Layer<any>,
	validators,
	operations: {},
});

test("validator properties", async () => {
	const result = await runner.runAllAndPrint(validatorProperties);
	expect(result.failed).toBe(0);
});
`;
};
