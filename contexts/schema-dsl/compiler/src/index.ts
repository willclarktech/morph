import type {
	AggregateRef,
	AttributeDef,
	CommandDef,
	ConditionExpr,
	ContextDef,
	ContextErrorDef,
	ContractDef,
	ContractStepDef,
	DomainSchema,
	EmittedEventDef,
	EntityDef,
	ErrorDef,
	Extensions,
	FieldDef,
	FunctionDef,
	InvariantDef,
	InvariantScope,
	ParamDef,
	PortDef,
	PortMethodDef,
	QueryDef,
	RelationshipDef,
	SubscriberDef,
	TypeDef,
	TypeParameterDef,
	TypeRef,
	ValueExpr,
	ValueObjectDef,
	VariantDef,
} from "@morphdsl/domain-schema";
import type {
	AliasTypeAst,
	AttributeAst,
	CallExprAst,
	CommandAst,
	ConditionExprAst,
	ContextAst,
	ContextErrorAst,
	ContractAst,
	DomainAst,
	EntityAst,
	ErrorRefAst,
	ExtensionEntryAst,
	FunctionDeclAst,
	InvariantAst,
	InvariantScopeAst,
	ParamAst,
	PortAst,
	ProductTypeAst,
	QueryAst,
	SourceRange,
	SubscriberAst,
	SumTypeAst,
	TagAst,
	TypeDeclAst,
	TypeExprAst,
	TypeParameterAst,
	ValueExprAst,
	ValueObjectAst,
} from "@morphdsl/schema-dsl-parser";

// =============================================================================
// Compile Error
// =============================================================================

export interface CompileError {
	readonly message: string;
	readonly range: SourceRange;
}

export interface CompileResult {
	readonly schema?: DomainSchema;
	readonly errors: readonly CompileError[];
}

// =============================================================================
// Name Resolution Context
// =============================================================================

interface NameMap {
	readonly entities: ReadonlySet<string>;
	readonly valueObjects: ReadonlySet<string>;
	readonly types: ReadonlySet<string>;
}

const buildNameMap = (context: ContextAst): NameMap => ({
	entities: new Set(context.entities.map((entity) => entity.name)),
	valueObjects: new Set(context.valueObjects.map((v) => v.name)),
	types: new Set(context.types.map((t) => t.name)),
});

// =============================================================================
// Type Compilation
// =============================================================================

const compileTypeRef = (ast: TypeExprAst, names: NameMap): TypeRef => {
	switch (ast.kind) {
		case "array": {
			return { kind: "array", element: compileTypeRef(ast.element, names) };
		}
		case "entityId": {
			return { kind: "entityId", entity: ast.entity };
		}
		case "function": {
			return {
				kind: "function",
				params: ast.params.map((p) => ({
					name: p.name,
					type: compileTypeRef(p.type, names),
				})),
				returns: compileTypeRef(ast.returns, names),
			};
		}
		case "generic": {
			return {
				kind: "generic",
				name: ast.name,
				args: ast.args.map((a) => compileTypeRef(a, names)),
			};
		}
		case "named": {
			if (names.entities.has(ast.name))
				return { kind: "entity", name: ast.name };
			if (names.valueObjects.has(ast.name))
				return { kind: "valueObject", name: ast.name };
			if (names.types.has(ast.name)) return { kind: "type", name: ast.name };
			return { kind: "typeParam", name: ast.name };
		}
		case "optional": {
			return { kind: "optional", inner: compileTypeRef(ast.inner, names) };
		}
		case "primitive": {
			return { kind: "primitive", name: ast.name };
		}
		case "typeParam": {
			return { kind: "typeParam", name: ast.name };
		}
		case "union": {
			return { kind: "union", values: [...ast.values] };
		}
	}
};

// =============================================================================
// Value/Condition Expression Compilation
// =============================================================================

const compileValueExpr = (ast: ValueExprAst): ValueExpr => {
	switch (ast.kind) {
		case "call": {
			return {
				kind: "call",
				name: ast.name,
				args: ast.args.map(compileValueExpr),
				...(ast.field !== undefined && { field: ast.field }),
			};
		}
		case "count": {
			return { kind: "count", collection: compileValueExpr(ast.collection) };
		}
		case "field": {
			return { kind: "field", path: ast.path };
		}
		case "literal": {
			return { kind: "literal", value: ast.value };
		}
		case "variable": {
			return { kind: "variable", name: ast.name };
		}
	}
};

const compileCondition = (ast: ConditionExprAst): ConditionExpr => {
	switch (ast.kind) {
		case "and": {
			return { kind: "and", conditions: ast.conditions.map(compileCondition) };
		}
		case "contains": {
			return {
				kind: "contains",
				collection: compileValueExpr(ast.collection),
				value: compileValueExpr(ast.value),
			};
		}
		case "equals":
		case "greaterThan":
		case "greaterThanOrEqual":
		case "lessThan":
		case "lessThanOrEqual":
		case "notEquals": {
			return {
				kind: ast.kind,
				left: compileValueExpr(ast.left),
				right: compileValueExpr(ast.right),
			};
		}
		case "exists": {
			return {
				kind: "exists",
				variable: ast.variable,
				collection: compileValueExpr(ast.collection),
				condition: compileCondition(ast.condition),
			};
		}
		case "forAll": {
			return {
				kind: "forAll",
				variable: ast.variable,
				collection: compileValueExpr(ast.collection),
				condition: compileCondition(ast.condition),
			};
		}
		case "implies": {
			return {
				kind: "implies",
				if: compileCondition(ast.if),
				then: compileCondition(ast.then),
			};
		}
		case "not": {
			return { kind: "not", condition: compileCondition(ast.condition) };
		}
		case "or": {
			return { kind: "or", conditions: ast.conditions.map(compileCondition) };
		}
	}
};

// =============================================================================
// Entity Compilation
// =============================================================================

const compileAttribute = (ast: AttributeAst, names: NameMap): AttributeDef => {
	const result: Record<string, unknown> = {
		description: ast.description ?? "",
		type: compileTypeRef(ast.type, names),
	};
	if (ast.optional) result["optional"] = true;
	if (ast.constraints && ast.constraints.length > 0)
		result["constraints"] = [...ast.constraints];
	return result as unknown as AttributeDef;
};

const compileEntity = (ast: EntityAst, names: NameMap): EntityDef => {
	const isRoot = ast.tags.some((t) => t.name === "root");
	const attributes: Record<string, AttributeDef> = {};
	for (const attribute of ast.attributes) {
		attributes[attribute.name] = compileAttribute(attribute, names);
	}

	const relationships: RelationshipDef[] = ast.relationships.map((r) => ({
		kind: r.kind,
		target: r.target,
		description: r.description ?? "",
		...(r.inverse ? { inverse: r.inverse } : {}),
	}));

	const result: Record<string, unknown> = {
		description: ast.description ?? "",
		attributes,
	};

	if (isRoot) result["aggregate"] = { root: true };
	result["relationships"] = relationships;

	return result as unknown as EntityDef;
};

const compileValueObject = (
	ast: ValueObjectAst,
	names: NameMap,
): ValueObjectDef => {
	const attributes: Record<string, AttributeDef> = {};
	for (const attribute of ast.attributes) {
		attributes[attribute.name] = compileAttribute(attribute, names);
	}
	return { description: ast.description ?? "", attributes };
};

// =============================================================================
// Operation Compilation
// =============================================================================

const compileParam = (ast: ParamAst, names: NameMap): ParamDef => {
	const result: Record<string, unknown> = {
		description: ast.description ?? "",
		type: compileTypeRef(ast.type, names),
	};
	if (ast.optional) result["optional"] = true;
	if (ast.sensitive) result["sensitive"] = true;
	return result as unknown as ParamDef;
};

const compileErrors = (errors: readonly ErrorRefAst[]): ErrorDef[] =>
	errors.map((error) => ({
		name: error.name,
		description: error.description ?? "",
		when: error.when ?? "",
	}));

const compileCommand = (
	ast: CommandAst,
	names: NameMap,
	profiles: ProfileMap = new Map(),
): CommandDef => {
	const input: Record<string, ParamDef> = {};
	for (const p of ast.input) {
		input[p.name] = compileParam(p, names);
	}

	const uses: AggregateRef[] = ast.uses.map((u) => ({
		access: u.access,
		aggregate: u.aggregate,
	}));

	const emits: EmittedEventDef[] = ast.emits.map((event) => ({
		name: event.name,
		description: event.description ?? "",
	}));

	const tags = extractTags(ast.tags, profiles);

	const result: Record<string, unknown> = {
		description: ast.description ?? "",
		emits,
		errors: compileErrors(ast.errors),
		input,
		output: compileTypeRef(ast.output, names),
		uses,
	};

	if (ast.pre && ast.pre.length > 0) result["pre"] = [...ast.pre];
	if (ast.post && ast.post.length > 0) result["post"] = [...ast.post];
	result["tags"] = tags;

	return result as unknown as CommandDef;
};

const compileQuery = (
	ast: QueryAst,
	names: NameMap,
	profiles: ProfileMap = new Map(),
): QueryDef => {
	const input: Record<string, ParamDef> = {};
	for (const p of ast.input) {
		input[p.name] = compileParam(p, names);
	}

	const uses: AggregateRef[] = ast.uses.map((u) => ({
		access: u.access,
		aggregate: u.aggregate,
	}));

	const tags = extractTags(ast.tags, profiles);

	const result: Record<string, unknown> = {
		description: ast.description ?? "",
		errors: compileErrors(ast.errors),
		input,
		output: compileTypeRef(ast.output, names),
		uses,
	};

	if (ast.pre && ast.pre.length > 0) result["pre"] = [...ast.pre];
	result["tags"] = tags;

	return result as unknown as QueryDef;
};

const compileFunction = (
	ast: FunctionDeclAst,
	names: NameMap,
	profiles: ProfileMap = new Map(),
): FunctionDef => {
	const input: Record<string, ParamDef> = {};
	for (const p of ast.input) {
		input[p.name] = compileParam(p, names);
	}

	const tags = extractTags(ast.tags, profiles);

	const result: Record<string, unknown> = {
		description: ast.description ?? "",
		errors: compileErrors(ast.errors),
		input,
		output: compileTypeRef(ast.output, names),
	};

	result["tags"] = tags;
	if (ast.typeParameters && ast.typeParameters.length > 0) {
		result["typeParameters"] = ast.typeParameters.map((tp) =>
			compileTypeParameter(tp, names),
		);
	}

	return result as unknown as FunctionDef;
};

// =============================================================================
// Tag Extraction
// =============================================================================

const OPERATION_TAGS = new Set([
	"api",
	"cli",
	"cli-client",
	"cli_client",
	"mcp",
	"ui",
	"vscode",
]);

type ProfileMap = ReadonlyMap<string, readonly string[]>;

const extractTags = (
	tags: readonly TagAst[],
	profiles: ProfileMap = new Map(),
): string[] => {
	const result: string[] = [];
	for (const t of tags) {
		if (t.name.startsWith("#")) {
			const profileName = t.name.slice(1);
			const profileTags = profiles.get(profileName);
			if (profileTags) {
				result.push(...profileTags);
			}
		} else if (OPERATION_TAGS.has(t.name)) {
			const normalized = t.name.replaceAll("_", "-");
			result.push(`@${normalized}`);
		}
	}
	return result;
};

// =============================================================================
// Invariant Compilation
// =============================================================================

const compileInvariant = (ast: InvariantAst): InvariantDef => {
	const scope = compileScope(ast.scope);
	return {
		name: ast.name,
		description: ast.description ?? "",
		violation: ast.violation ?? "",
		condition: compileCondition(ast.condition),
		scope,
	};
};

const compileScope = (scope: InvariantScopeAst): InvariantScope => {
	switch (scope.kind) {
		case "aggregate": {
			return { kind: "aggregate", root: scope.root };
		}
		case "context": {
			return { kind: "context" };
		}
		case "entity": {
			return { kind: "entity", entity: scope.entity };
		}
		case "global": {
			return { kind: "global" };
		}
		case "operation": {
			return {
				kind: "operation",
				operation: scope.operation,
				when: scope.when,
			};
		}
	}
};

// =============================================================================
// Contract Compilation
// =============================================================================

const compileContractStep = (ast: CallExprAst): ContractStepDef => ({
	method: ast.name,
	args: ast.args.map(compileValueExpr),
});

export const compileContract = (ast: ContractAst): ContractDef => ({
	name: ast.name,
	port: ast.port,
	description: ast.description ?? "",
	bindings: ast.bindings.map((b) => ({
		name: b.name,
		type: b.type as
			| "boolean"
			| "date"
			| "datetime"
			| "float"
			| "integer"
			| "string",
	})),
	after: ast.afterSteps.map(compileContractStep),
	then: compileCondition(ast.assertion),
});

// =============================================================================
// Subscriber Compilation
// =============================================================================

const compileSubscriber = (ast: SubscriberAst): SubscriberDef => ({
	description: ast.description ?? "",
	events: [...ast.events],
});

// =============================================================================
// Port Compilation
// =============================================================================

const compilePort = (ast: PortAst, names: NameMap): PortDef => {
	const methods: Record<string, PortMethodDef> = {};
	for (const m of ast.methods) {
		const params: Record<string, FieldDef> = {};
		for (const p of m.params) {
			params[p.name] = {
				description: p.description ?? "",
				type: compileTypeRef(p.type, names),
			};
		}
		methods[m.name] = {
			description: m.description ?? "",
			params,
			returns: compileTypeRef(m.returns, names),
			errors: m.throws ?? [],
		};
	}

	const result: Record<string, unknown> = {
		description: ast.description ?? "",
		methods,
	};

	if (ast.typeParameters && ast.typeParameters.length > 0) {
		result["typeParameters"] = ast.typeParameters.map((tp) =>
			compileTypeParameter(tp, names),
		);
	}

	return result as unknown as PortDef;
};

// =============================================================================
// Context Error Compilation
// =============================================================================

const compileContextError = (
	ast: ContextErrorAst,
	names: NameMap,
): ContextErrorDef => {
	const fields: Record<
		string,
		{ description?: string; optional?: boolean; type: TypeRef }
	> = {};
	for (const f of ast.fields) {
		const entry: Record<string, unknown> = {
			type: compileTypeRef(f.type, names),
		};
		if (f.description) entry["description"] = f.description;
		if (f.optional) entry["optional"] = true;
		fields[f.name] = entry as {
			description?: string;
			optional?: boolean;
			type: TypeRef;
		};
	}
	return { description: ast.description ?? "", fields };
};

// =============================================================================
// Type Compilation
// =============================================================================

const compileTypeParameter = (
	tp: TypeParameterAst,
	names: NameMap,
): TypeParameterDef => {
	const result: Record<string, unknown> = { name: tp.name };
	if (tp.constraint)
		result["constraint"] = compileTypeRef(tp.constraint, names);
	if (tp.default) result["default"] = compileTypeRef(tp.default, names);
	return result as unknown as TypeParameterDef;
};

const compileType = (ast: TypeDeclAst, names: NameMap): TypeDef => {
	switch (ast.kind) {
		case "alias": {
			return compileAliasType(ast, names);
		}
		case "product": {
			return compileProductType(ast, names);
		}
		case "sum": {
			return compileSumType(ast, names);
		}
	}
};

const compileProductType = (ast: ProductTypeAst, names: NameMap): TypeDef => {
	const fields: Record<string, FieldDef> = {};
	for (const f of ast.fields) {
		const entry: Record<string, unknown> = {
			description: f.description ?? "",
			type: compileTypeRef(f.type, names),
		};
		if (f.optional) entry["optional"] = true;
		fields[f.name] = entry as unknown as FieldDef;
	}

	const result: Record<string, unknown> = {
		kind: "product",
		description: ast.description ?? "",
		fields,
	};

	if (ast.typeParameters && ast.typeParameters.length > 0) {
		result["typeParameters"] = ast.typeParameters.map((tp) =>
			compileTypeParameter(tp, names),
		);
	}

	return result as unknown as TypeDef;
};

const compileSumType = (ast: SumTypeAst, names: NameMap): TypeDef => {
	const variants: Record<string, VariantDef> = {};
	for (const v of ast.variants) {
		const fields: Record<string, FieldDef> = {};
		if (v.fields) {
			for (const f of v.fields) {
				const entry: Record<string, unknown> = {
					description: f.description ?? "",
					type: compileTypeRef(f.type, names),
				};
				if (f.optional) entry["optional"] = true;
				fields[f.name] = entry as unknown as FieldDef;
			}
		}
		variants[v.name] = {
			description: v.description ?? "",
			...(Object.keys(fields).length > 0 ? { fields } : {}),
		};
	}

	const result: Record<string, unknown> = {
		kind: "sum",
		description: ast.description ?? "",
		discriminator: ast.discriminator,
		variants,
	};

	if (ast.typeParameters && ast.typeParameters.length > 0) {
		result["typeParameters"] = ast.typeParameters.map((tp) =>
			compileTypeParameter(tp, names),
		);
	}

	return result as unknown as TypeDef;
};

const compileAliasType = (ast: AliasTypeAst, names: NameMap): TypeDef => {
	const result: Record<string, unknown> = {
		kind: "alias",
		description: ast.description ?? "",
		type: compileTypeRef(ast.type, names),
	};

	if (ast.typeParameters && ast.typeParameters.length > 0) {
		result["typeParameters"] = ast.typeParameters.map((tp) =>
			compileTypeParameter(tp, names),
		);
	}

	return result as unknown as TypeDef;
};

// =============================================================================
// Extensions Compilation
// =============================================================================

const compileExtensions = (
	entries: readonly ExtensionEntryAst[],
): Extensions => {
	const result: Record<string, unknown> = {};

	for (const entry of entries) {
		switch (entry.name) {
			case "auth": {
				result["auth"] = {
					providers: [...entry.options],
					default:
						entry.default ?? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- grammar guarantees non-empty
						entry.options[0]!,
				};
				break;
			}
			case "encoding": {
				result["encoding"] = {
					formats: [...entry.options],
					default:
						entry.default ?? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- grammar guarantees non-empty
						entry.options[0]!,
				};
				break;
			}
			case "eventStore": {
				result["eventStore"] = {
					backends: [...entry.options],
					default:
						entry.default ?? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- grammar guarantees non-empty
						entry.options[0]!,
				};
				break;
			}
			case "i18n": {
				result["i18n"] = {
					languages: [...entry.options],
					baseLanguage:
						entry.base ?? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- grammar guarantees non-empty
						entry.options[0]!,
				};
				break;
			}
			case "sse": {
				result["sse"] = {
					enabled: entry.options.includes("auto")
						? "auto"
						: entry.options.includes("true"),
				};
				break;
			}
			case "storage": {
				result["storage"] = {
					backends: [...entry.options],
					default:
						entry.default ?? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- grammar guarantees non-empty
						entry.options[0]!,
				};
				break;
			}
		}
	}

	return result as unknown as Extensions;
};

// =============================================================================
// Context Compilation
// =============================================================================

const compileContext = (
	ast: ContextAst,
	profiles: ProfileMap = new Map(),
): ContextDef => {
	const names = buildNameMap(ast);

	const entities: Record<string, EntityDef> = {};
	for (const entity of ast.entities) {
		entities[entity.name] = compileEntity(entity, names);
	}

	const result: Record<string, unknown> = {
		description: ast.description ?? "",
		entities,
	};

	const commands: Record<string, CommandDef> = {};
	for (const c of ast.commands) {
		commands[c.name] = compileCommand(c, names, profiles);
	}
	if (ast.commands.length > 0) result["commands"] = commands;

	result["dependencies"] = [...ast.dependencies];

	const functions: Record<string, FunctionDef> = {};
	for (const f of ast.functions) {
		functions[f.name] = compileFunction(f, names, profiles);
	}
	if (ast.functions.length > 0) result["functions"] = functions;

	result["invariants"] = ast.invariants.map(compileInvariant);

	if (ast.ports.length > 0) {
		const ports: Record<string, PortDef> = {};
		for (const p of ast.ports) {
			ports[p.name] = compilePort(p, names);
		}
		result["ports"] = ports;
	}

	if (ast.queries.length > 0) {
		const queries: Record<string, QueryDef> = {};
		for (const q of ast.queries) {
			queries[q.name] = compileQuery(q, names, profiles);
		}
		result["queries"] = queries;
	}

	if (ast.subscribers.length > 0) {
		const subscribers: Record<string, SubscriberDef> = {};
		for (const s of ast.subscribers) {
			subscribers[s.name] = compileSubscriber(s);
		}
		result["subscribers"] = subscribers;
	}

	if (ast.types.length > 0) {
		const types: Record<string, TypeDef> = {};
		for (const t of ast.types) {
			types[t.name] = compileType(t, names);
		}
		result["types"] = types;
	}

	if (ast.valueObjects.length > 0) {
		const valueObjects: Record<string, ValueObjectDef> = {};
		for (const v of ast.valueObjects) {
			valueObjects[v.name] = compileValueObject(v, names);
		}
		result["valueObjects"] = valueObjects;
	}

	if (ast.errors.length > 0) {
		const errors: Record<string, ContextErrorDef> = {};
		for (const error of ast.errors) {
			errors[error.name] = compileContextError(error, names);
		}
		result["errors"] = errors;
	}

	return result as unknown as ContextDef;
};

// =============================================================================
// Domain Compilation
// =============================================================================

export const compile = (ast: DomainAst): CompileResult => {
	const mutableProfiles = new Map<string, readonly string[]>();
	if (ast.profiles) {
		for (const entry of ast.profiles.entries) {
			const tags = entry.tags
				.filter((t) => OPERATION_TAGS.has(t.name))
				.map((t) => `@${t.name.replaceAll("_", "-")}`);
			mutableProfiles.set(entry.name, tags);
		}
	}
	const profiles: ProfileMap = mutableProfiles;

	const contexts: Record<string, ContextDef> = {};
	for (const context of ast.contexts) {
		contexts[context.name] = compileContext(context, profiles);
	}

	const schema: Record<string, unknown> = {
		name: ast.name,
	};

	const METADATA_KEYS = new Set([
		"author",
		"description",
		"license",
		"npmScope",
		"repository",
	]);
	for (const entry of ast.metadata) {
		if (METADATA_KEYS.has(entry.key)) {
			schema[entry.key] = entry.value;
		}
	}

	if (ast.extensions) {
		schema["extensions"] = compileExtensions(ast.extensions.entries);
	}

	if (profiles.size > 0) {
		const profilesObject: Record<string, readonly string[]> = {};
		for (const [name, tags] of profiles) {
			profilesObject[name] = tags;
		}
		schema["profiles"] = profilesObject;
	}

	schema["contexts"] = contexts;

	return {
		schema: schema as DomainSchema,
		errors: [],
	};
};
