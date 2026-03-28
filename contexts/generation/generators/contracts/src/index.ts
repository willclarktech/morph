import type {
	ConditionExpr,
	ContractDef,
	GeneratedFile,
	ValueExpr,
} from "@morph/domain-schema";

import { toCamelCase } from "@morph/utils";

// =============================================================================
// Backend Configuration
// =============================================================================

interface BackendInfo {
	readonly pkg: string;
	readonly factory: string;
	readonly setup?: "jsonfile-storage" | "sqlite" | "jsonfile-eventstore";
}

const STORAGE_BACKEND_IMPORTS: Record<string, BackendInfo> = {
	jsonfile: {
		pkg: "@morph/storage-jsonfile-impls",
		factory: "createJsonFileTransport",
		setup: "jsonfile-storage",
	},
	memory: {
		pkg: "@morph/storage-memory-impls",
		factory: "createMemoryTransport",
	},
	redis: {
		pkg: "@morph/storage-redis-impls",
		factory: "createRedisTransport",
	},
	sqlite: {
		pkg: "@morph/storage-sqlite-impls",
		factory: "createSqliteTransport",
		setup: "sqlite",
	},
};

const EVENTSTORE_BACKEND_IMPORTS: Record<string, BackendInfo> = {
	jsonfile: {
		pkg: "@morph/eventstore-jsonfile-impls",
		factory: "createJsonFileEventStoreTransport",
		setup: "jsonfile-eventstore",
	},
	memory: {
		pkg: "@morph/eventstore-memory-impls",
		factory: "createMemoryEventStoreTransport",
	},
	redis: {
		pkg: "@morph/eventstore-redis-impls",
		factory: "createRedisEventStoreTransport",
	},
};

export interface ContractGeneratorConfig {
	readonly storageBackends: readonly string[];
	readonly eventStoreBackends: readonly string[];
	readonly outputDir: string;
}

// =============================================================================
// Contract Suite Factory Generation
// =============================================================================

const generateBindingArbitrary = (
	type: "boolean" | "date" | "datetime" | "float" | "integer" | "string",
): string => {
	switch (type) {
		case "boolean": {
			return "fc.boolean()";
		}
		case "date": {
			return "fc.date()";
		}
		case "datetime": {
			return "fc.date()";
		}
		case "float": {
			return "fc.double()";
		}
		case "integer": {
			return "fc.bigInt()";
		}
		case "string": {
			return "fc.uuid()";
		}
	}
};

const generateContractSuiteFactory = (
	port: string,
	contracts: readonly ContractDef[],
): string => {
	const portCamel = toCamelCase(port);
	const lines: string[] = [];

	lines.push('import { contractProperty } from "@morph/property";');
	lines.push('import * as fc from "fast-check";');
	lines.push('import { Effect } from "effect";');
	lines.push("");
	lines.push(
		`export const ${portCamel}Contracts = (createTransport: () => Effect.Effect<any, any>) => [`,
	);

	for (const contract of contracts) {
		const bindingNames = contract.bindings.map((b) => b.name);
		const arbitraryFields = contract.bindings
			.map(
				(b) =>
					`${b.name}: ${generateBindingArbitrary(b.type as "boolean" | "datetime" | "float" | "integer" | "string")}`,
			)
			.join(", ");
		const arbitrary =
			contract.bindings.length > 0
				? `fc.record({ ${arbitraryFields} })`
				: "fc.constant({})";

		lines.push(`\tcontractProperty({`);
		lines.push(`\t\tname: ${JSON.stringify(contract.name)},`);
		lines.push(`\t\tdescription: ${JSON.stringify(contract.description)},`);
		lines.push(`\t\tport: ${JSON.stringify(contract.port)},`);
		lines.push(`\t\tarbitrary: ${arbitrary},`);

		if (bindingNames.length > 0) {
			lines.push(
				`\t\tlaw: async ({ ${bindingNames.join(", ")} }) => {`,
			);
		} else {
			lines.push(`\t\tlaw: async () => {`);
		}

		lines.push(
			`\t\t\treturn Effect.runPromise(Effect.gen(function*() {`,
		);
		lines.push(`\t\t\t\tconst t = yield* createTransport();`);

		// Setup steps
		for (const step of contract.after) {
			const args = step.args.map(compileValueExprToTs).join(", ");
			lines.push(`\t\t\t\tyield* t.${step.method}(${args});`);
		}

		// Assertion
		lines.push(
			`\t\t\t\treturn ${compileConditionToTs(contract.then)};`,
		);

		lines.push(
			`\t\t\t}).pipe(Effect.orDie) as Effect.Effect<boolean>);`,
		);
		lines.push(`\t\t},`);
		lines.push(`\t}),`);
	}

	lines.push(`];`);
	lines.push("");

	return lines.join("\n");
};

// =============================================================================
// Expression Compilation to TypeScript
// =============================================================================

const compileValueExprToTs = (expr: ValueExpr): string => {
	switch (expr.kind) {
		case "call": {
			const args = expr.args.map(compileValueExprToTs);
			const call = `(yield* t.${expr.name}(${args.join(", ")}))`;
			return expr.field ? `${call}.${expr.field}` : call;
		}
		case "count": {
			return `${compileValueExprToTs(expr.collection)}.length`;
		}
		case "field": {
			return expr.path;
		}
		case "literal": {
			if (expr.value === undefined || expr.value === null) {
				return "undefined";
			}
			return JSON.stringify(expr.value);
		}
		case "variable": {
			return expr.name;
		}
	}
};

const compileConditionToTs = (condition: ConditionExpr): string => {
	switch (condition.kind) {
		case "and": {
			return condition.conditions
				.map((sub) => compileConditionToTs(sub))
				.join(" && ");
		}
		case "contains": {
			return `${compileValueExprToTs(condition.collection)}.includes(${compileValueExprToTs(condition.value)})`;
		}
		case "equals": {
			return `${compileValueExprToTs(condition.left)} === ${compileValueExprToTs(condition.right)}`;
		}
		case "exists":
		case "forAll":
		case "implies": {
			return "true";
		}
		case "greaterThan": {
			return `${compileValueExprToTs(condition.left)} > ${compileValueExprToTs(condition.right)}`;
		}
		case "greaterThanOrEqual": {
			return `${compileValueExprToTs(condition.left)} >= ${compileValueExprToTs(condition.right)}`;
		}
		case "lessThan": {
			return `${compileValueExprToTs(condition.left)} < ${compileValueExprToTs(condition.right)}`;
		}
		case "lessThanOrEqual": {
			return `${compileValueExprToTs(condition.left)} <= ${compileValueExprToTs(condition.right)}`;
		}
		case "not": {
			return `!(${compileConditionToTs(condition.condition)})`;
		}
		case "notEquals": {
			return `${compileValueExprToTs(condition.left)} !== ${compileValueExprToTs(condition.right)}`;
		}
		case "or": {
			return condition.conditions
				.map((sub) => `(${compileConditionToTs(sub)})`)
				.join(" || ");
		}
	}
};

const collectMethodsFromValue = (
	expr: ValueExpr,
	methods: Set<string>,
): void => {
	switch (expr.kind) {
		case "call": {
			methods.add(expr.name);
			for (const arg of expr.args) collectMethodsFromValue(arg, methods);
			break;
		}
		case "count": {
			collectMethodsFromValue(expr.collection, methods);
			break;
		}
		default: {
			break;
		}
	}
};

const collectMethodsFromCondition = (
	condition: ConditionExpr,
	methods: Set<string>,
): void => {
	switch (condition.kind) {
		case "and":
		case "or": {
			for (const sub of condition.conditions) {
				collectMethodsFromCondition(sub, methods);
			}
			break;
		}
		case "contains": {
			collectMethodsFromValue(condition.collection, methods);
			collectMethodsFromValue(condition.value, methods);
			break;
		}
		case "equals":
		case "greaterThan":
		case "greaterThanOrEqual":
		case "lessThan":
		case "lessThanOrEqual":
		case "notEquals": {
			collectMethodsFromValue(condition.left, methods);
			collectMethodsFromValue(condition.right, methods);
			break;
		}
		case "exists":
		case "forAll": {
			collectMethodsFromValue(condition.collection, methods);
			collectMethodsFromCondition(condition.condition, methods);
			break;
		}
		case "implies": {
			collectMethodsFromCondition(condition.if, methods);
			collectMethodsFromCondition(condition.then, methods);
			break;
		}
		case "not": {
			collectMethodsFromCondition(condition.condition, methods);
			break;
		}
	}
};

// =============================================================================
// Test Harness Generation
// =============================================================================

const needsSetup = (
	backends: readonly string[],
	backendImports: Record<string, BackendInfo>,
	setup: string,
): boolean => backends.some((b) => backendImports[b]?.setup === setup);

const generateFactoryCall = (info: BackendInfo): string => {
	switch (info.setup) {
		case "jsonfile-storage": {
			return `() => {
\t\t\ttempDir = mkdtempSync(join(tmpdir(), "storage-jsonfile-"));
\t\t\tconst filePath = join(tempDir, "store.json");
\t\t\treturn Effect.succeed(${info.factory}(filePath, "test"));
\t\t}`;
		}
		case "jsonfile-eventstore": {
			return `() => {
\t\t\ttempDir = mkdtempSync(join(tmpdir(), "eventstore-jsonfile-"));
\t\t\tconst filePath = join(tempDir, "events.json");
\t\t\treturn Effect.succeed(${info.factory}(filePath));
\t\t}`;
		}
		case "sqlite": {
			return `() => {
\t\t\tconst db = new Database(":memory:");
\t\t\treturn Effect.succeed(${info.factory}(db, "test_store"));
\t\t}`;
		}
		default: {
			return `() => ${info.factory}()`;
		}
	}
};

const generateTestHarness = (
	port: string,
	backends: readonly string[],
	backendImports: Record<string, BackendInfo>,
): string => {
	const portCamel = toCamelCase(port);
	const lines: string[] = [];

	const usesJsonfile = needsSetup(backends, backendImports, "jsonfile-storage") ||
		needsSetup(backends, backendImports, "jsonfile-eventstore");
	const usesSqlite = needsSetup(backends, backendImports, "sqlite");
	const usesEffect = backends.some((b) => backendImports[b]?.setup !== undefined);

	const bunTestImports = ["describe", "test"];
	if (usesJsonfile) bunTestImports.push("afterEach");
	lines.push(`import { ${bunTestImports.join(", ")} } from "bun:test";`);
	if (usesSqlite) {
		lines.push('import { Database } from "bun:sqlite";');
	}
	if (usesJsonfile) {
		lines.push('import { mkdtempSync, rmSync } from "node:fs";');
		lines.push('import { join } from "node:path";');
		lines.push('import { tmpdir } from "node:os";');
	}
	lines.push('import * as fc from "fast-check";');
	if (usesEffect) {
		lines.push('import { Effect } from "effect";');
	}
	lines.push("");
	lines.push(
		`import { ${portCamel}Contracts } from "./${portCamel}.contracts";`,
	);

	for (const backend of backends) {
		const info = backendImports[backend];
		if (info) {
			lines.push(`import { ${info.factory} } from "${info.pkg}";`);
		}
	}

	lines.push("");
	lines.push(`describe("${port} contracts", () => {`);

	for (const backend of backends) {
		const info = backendImports[backend];
		if (!info) continue;
		lines.push(`\tdescribe("${backend}", () => {`);

		if (info.setup === "jsonfile-storage" || info.setup === "jsonfile-eventstore") {
			lines.push(`\t\tlet tempDir: string;`);
			lines.push("");
			lines.push(`\t\tafterEach(() => {`);
			lines.push(`\t\t\tif (tempDir) rmSync(tempDir, { recursive: true, force: true });`);
			lines.push(`\t\t});`);
			lines.push("");
		}

		lines.push(
			`\t\tconst suites = ${portCamel}Contracts(${generateFactoryCall(info)});`,
		);
		lines.push(`\t\tfor (const suite of suites) {`);
		lines.push(`\t\t\ttest(suite.name, async () => {`);
		lines.push(
			`\t\t\t\tawait fc.assert(fc.asyncProperty(suite.arbitrary, async (input: any) => suite.law(input)));`,
		);
		lines.push(`\t\t\t});`);
		lines.push(`\t\t}`);
		lines.push(`\t});`);
	}

	lines.push(`});`);
	lines.push("");

	return lines.join("\n");
};

// =============================================================================
// Public API
// =============================================================================

export const generateContractTests = (
	contracts: readonly ContractDef[],
	config: ContractGeneratorConfig,
): GeneratedFile[] => {
	const files: GeneratedFile[] = [];

	// Group contracts by port
	const byPort = new Map<string, ContractDef[]>();
	for (const contract of contracts) {
		const existing = byPort.get(contract.port) ?? [];
		existing.push(contract);
		byPort.set(contract.port, existing);
	}

	for (const [port, portContracts] of byPort) {
		const portCamel = toCamelCase(port);

		// Determine which backends apply to this port
		const isEventStore = port === "EventStoreTransport";
		const backends = isEventStore
			? config.eventStoreBackends
			: config.storageBackends;
		const backendImports = isEventStore
			? EVENTSTORE_BACKEND_IMPORTS
			: STORAGE_BACKEND_IMPORTS;

		// Generate contract suite factory
		files.push({
			content: generateContractSuiteFactory(port, portContracts),
			filename: `${config.outputDir}/${portCamel}.contracts.ts`,
		});

		// Generate test harness
		if (backends.length > 0) {
			files.push({
				content: generateTestHarness(port, backends, backendImports),
				filename: `${config.outputDir}/${portCamel}.test.ts`,
			});
		}
	}

	return files;
};
