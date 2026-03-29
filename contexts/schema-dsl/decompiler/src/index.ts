import type {
	AggregateRef,
	AttributeDef,
	CommandDef,
	ConditionExpr,
	ContextDef,
	ContextErrorDef,
	ContractDef,
	DomainSchema,
	EntityDef,
	ErrorDef,
	Extensions,
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

// =============================================================================
// Top-level
// =============================================================================

const METADATA_KEYS = [
	"license",
	"author",
	"description",
	"repository",
	"npmScope",
] as const;

export const decompile = (schema: DomainSchema): string => {
	const lines: string[] = [];
	lines.push(`domain ${schema.name}`);

	for (const key of METADATA_KEYS) {
		const value = schema[key];
		if (value !== undefined) {
			lines.push(`\t${key} ${JSON.stringify(value)}`);
		}
	}

	if (schema.extensions) {
		lines.push("");
		lines.push(...decompileExtensions(schema.extensions));
	}

	if (schema.profiles) {
		lines.push("");
		lines.push(...decompileProfiles(schema.profiles));
	}

	const profileLookup = buildProfileLookup(schema.profiles);

	for (const [name, context] of sorted(schema.contexts)) {
		lines.push("");
		lines.push(...decompileContext(name, context, profileLookup));
	}

	lines.push("");
	return lines.join("\n");
};

// =============================================================================
// Extensions
// =============================================================================

const decompileExtensions = (extension: Extensions): string[] => {
	const lines: string[] = [];
	lines.push("extensions {");

	if (extension.storage) {
		const options = extension.storage.backends.join(", ");
		lines.push(`\tstorage [${options}] default ${extension.storage.default}`);
	}
	if (extension.auth) {
		const options = extension.auth.providers.join(", ");
		lines.push(`\tauth [${options}] default ${extension.auth.default}`);
	}
	if (extension.encoding) {
		const options = extension.encoding.formats.join(", ");
		lines.push(`\tencoding [${options}] default ${extension.encoding.default}`);
	}
	if (extension.eventStore) {
		const options = extension.eventStore.backends.join(", ");
		lines.push(
			`\teventStore [${options}] default ${extension.eventStore.default}`,
		);
	}
	if (extension.sse) {
		const value =
			extension.sse.enabled === "auto"
				? "auto"
				: extension.sse.enabled
					? "true"
					: "false";
		lines.push(`\tsse [${value}]`);
	}
	if (extension.i18n) {
		const options = extension.i18n.languages.join(", ");
		lines.push(`\ti18n [${options}] base ${extension.i18n.baseLanguage}`);
	}

	lines.push("}");
	return lines;
};

// =============================================================================
// Context
// =============================================================================

const decompileContext = (
	name: string,
	context: ContextDef,
	profileLookup: ProfileLookup = new Map(),
): string[] => {
	const lines: string[] = [];
	lines.push(`context ${name} ${q(context.description)} {`);

	if (context.dependencies.length > 0) {
		lines.push(`\tdepends on ${context.dependencies.join(", ")}`);
	}

	for (const [entityName, entityDef] of sorted(context.entities)) {
		lines.push("");
		lines.push(...indent(decompileEntity(entityName, entityDef)));
	}

	if (context.valueObjects) {
		for (const [vName, vDef] of sorted(context.valueObjects)) {
			lines.push("");
			lines.push(...indent(decompileValueObject(vName, vDef)));
		}
	}

	if (context.types) {
		for (const [tName, tDef] of sorted(context.types)) {
			lines.push("");
			lines.push(...indent(decompileTypeDef(tName, tDef)));
		}
	}

	if (context.ports) {
		for (const [pName, pDef] of sorted(context.ports)) {
			lines.push("");
			lines.push(...indent(decompilePort(pName, pDef)));
		}
	}

	if (context.errors) {
		for (const [errorName, errorDef] of sorted(context.errors)) {
			lines.push("");
			lines.push(...indent(decompileContextError(errorName, errorDef)));
		}
	}

	if (context.invariants.length > 0) {
		for (const inv of context.invariants) {
			lines.push("");
			lines.push(...indent(decompileInvariant(inv)));
		}
	}

	for (const [cName, cDef] of sorted(context.commands)) {
		lines.push("");
		lines.push(...indent(decompileCommand(cName, cDef, profileLookup)));
	}

	for (const [qName, qDef] of sorted(context.queries)) {
		lines.push("");
		lines.push(...indent(decompileQuery(qName, qDef, profileLookup)));
	}

	if (context.functions) {
		for (const [fName, fDef] of sorted(context.functions)) {
			lines.push("");
			lines.push(...indent(decompileFunction(fName, fDef, profileLookup)));
		}
	}

	if (context.subscribers) {
		for (const [sName, sDef] of sorted(context.subscribers)) {
			lines.push("");
			lines.push(...indent(decompileSubscriber(sName, sDef)));
		}
	}

	lines.push("}");
	return lines;
};

// =============================================================================
// Entity
// =============================================================================

const decompileEntity = (name: string, entity: EntityDef): string[] => {
	const lines: string[] = [];
	if (entity.aggregate?.root) lines.push("@root");
	lines.push(`entity ${name} ${q(entity.description)} {`);

	for (const [aName, aDef] of sorted(entity.attributes)) {
		lines.push(...indent(decompileAttribute(aName, aDef)));
	}

	for (const relationship of entity.relationships) {
		lines.push(...indent(decompileRelationship(relationship)));
	}

	lines.push("}");
	return lines;
};

const decompileAttribute = (
	name: string,
	attribute: AttributeDef,
): string[] => {
	const lines: string[] = [];
	const tags: string[] = [];

	if (attribute.constraints) {
		for (const c of attribute.constraints) {
			switch (c.kind) {
				case "custom": {
					tags.push(`@custom(${c.name}, ${q(c.description)})`);
					break;
				}
				case "nonEmpty": {
					tags.push("@nonEmpty");
					break;
				}
				case "pattern": {
					tags.push(`@pattern(${q(c.regex)})`);
					break;
				}
				case "positive": {
					tags.push("@positive");
					break;
				}
				case "range": {
					tags.push(`@range(${c.min ?? ""}..${c.max ?? ""})`);
					break;
				}
				case "unique": {
					tags.push("@unique");
					break;
				}
			}
		}
	}

	for (const tag of tags) lines.push(tag);

	const opt = attribute.optional ? "?" : "";
	const typeString = decompileTypeRef(attribute.type);
	lines.push(`${name}${opt}: ${typeString} ${q(attribute.description)}`);

	return lines;
};

const decompileRelationship = (relationship: RelationshipDef): string[] => [
	`${relationship.kind} ${relationship.target} ${q(relationship.description)}`,
];

// =============================================================================
// Value Object
// =============================================================================

const decompileValueObject = (name: string, vo: ValueObjectDef): string[] => {
	const lines: string[] = [];
	lines.push(`value ${name} ${q(vo.description)} {`);
	for (const [aName, aDef] of sorted(vo.attributes)) {
		lines.push(...indent(decompileAttribute(aName, aDef)));
	}
	lines.push("}");
	return lines;
};

// =============================================================================
// Type Ref
// =============================================================================

const decompileTypeRef = (ref: TypeRef): string => {
	switch (ref.kind) {
		case "array": {
			return `${decompileTypeRef(ref.element)}[]`;
		}
		case "entity": {
			return ref.name;
		}
		case "entityId": {
			return `${ref.entity}.id`;
		}
		case "function": {
			return `(${ref.params.map((p) => `${p.name}: ${decompileTypeRef(p.type)}`).join(", ")}) => ${decompileTypeRef(ref.returns)}`;
		}
		case "generic": {
			return `${ref.name}<${ref.args.map(decompileTypeRef).join(", ")}>`;
		}
		case "optional": {
			return `${decompileTypeRef(ref.inner)}?`;
		}
		case "primitive": {
			return ref.name;
		}
		case "type": {
			return ref.name;
		}
		case "typeParam": {
			return ref.name;
		}
		case "union": {
			return ref.values.map((v) => q(v)).join(" | ");
		}
		case "valueObject": {
			return ref.name;
		}
	}
};

// =============================================================================
// Command
// =============================================================================

const decompileCommand = (
	name: string,
	cmd: CommandDef,
	profileLookup: ProfileLookup = new Map(),
): string[] => {
	const lines: string[] = [];

	const tags = decompileTags(cmd.tags, profileLookup);
	if (tags) lines.push(tags);

	lines.push(`command ${name} ${q(cmd.description)}`);
	lines.push(...indent(decompileUsesClause(cmd.uses)));

	if (cmd.pre && cmd.pre.length > 0) {
		lines.push(`\tpre ${cmd.pre.join(", ")}`);
	}
	if (cmd.post && cmd.post.length > 0) {
		lines.push(`\tpost ${cmd.post.join(", ")}`);
	}

	lines.push(...indent(decompileInputClause(cmd.input)));
	lines.push(`\toutput ${decompileTypeRef(cmd.output)}`);

	const emitParts: string[] = [];
	for (const event of cmd.emits) {
		emitParts.push(
			event.description ? `${event.name} ${q(event.description)}` : event.name,
		);
	}
	lines.push(`\temits ${emitParts.join(", ")}`);

	if (cmd.errors.length > 0) {
		lines.push(...indent(decompileErrorsClause(cmd.errors)));
	}

	return lines;
};

// =============================================================================
// Query
// =============================================================================

const decompileQuery = (
	name: string,
	query: QueryDef,
	profileLookup: ProfileLookup = new Map(),
): string[] => {
	const lines: string[] = [];

	const tags = decompileTags(query.tags, profileLookup);
	if (tags) lines.push(tags);

	lines.push(`query ${name} ${q(query.description)}`);
	lines.push(...indent(decompileUsesClause(query.uses)));

	if (query.pre && query.pre.length > 0) {
		lines.push(`\tpre ${query.pre.join(", ")}`);
	}

	lines.push(...indent(decompileInputClause(query.input)));
	lines.push(`\toutput ${decompileTypeRef(query.output)}`);

	if (query.errors.length > 0) {
		lines.push(...indent(decompileErrorsClause(query.errors)));
	}

	return lines;
};

// =============================================================================
// Function
// =============================================================================

const decompileFunction = (
	name: string,
	function_: FunctionDef,
	profileLookup: ProfileLookup = new Map(),
): string[] => {
	const lines: string[] = [];

	const tags = decompileTags(function_.tags, profileLookup);
	if (tags) lines.push(tags);

	const typeParams =
		function_.typeParameters && function_.typeParameters.length > 0
			? `<${function_.typeParameters.map(decompileTypeParameter).join(", ")}>`
			: "";

	lines.push(`function ${name}${typeParams} ${q(function_.description)}`);
	lines.push(...indent(decompileInputClause(function_.input)));
	lines.push(`\toutput ${decompileTypeRef(function_.output)}`);

	if (function_.errors.length > 0) {
		lines.push(...indent(decompileErrorsClause(function_.errors)));
	}

	return lines;
};

// =============================================================================
// Invariant
// =============================================================================

const decompileInvariant = (inv: InvariantDef): string[] => {
	const lines: string[] = [];

	const scopeTag = decompileScopeTag(inv.scope);
	if (scopeTag) lines.push(scopeTag);

	const entitySuffix =
		inv.scope.kind === "entity" ? ` on ${inv.scope.entity}` : "";

	lines.push(`invariant ${inv.name}${entitySuffix}`);
	lines.push(`\t${q(inv.description)}`);
	lines.push(`\tviolation ${q(inv.violation)}`);
	lines.push(`\twhere ${decompileCondition(inv.condition)}`);

	return lines;
};

const decompileScopeTag = (scope: InvariantScope): string | undefined => {
	switch (scope.kind) {
		case "aggregate": {
			return `@aggregate(${scope.root})`;
		}
		case "context": {
			return "@context";
		}
		case "entity": {
			return undefined;
		}
		case "global": {
			return "@global";
		}
		case "operation": {
			return scope.when === "pre"
				? `@pre(${scope.operation})`
				: `@post(${scope.operation})`;
		}
	}
};

// =============================================================================
// Contract
// =============================================================================

export const decompileContract = (contract: ContractDef): string[] => {
	const lines: string[] = [];

	const bindingParts = contract.bindings.map((b) => `${b.name}: ${b.type}`);
	const givenClause =
		bindingParts.length > 0 ? `\n\tgiven ${bindingParts.join(", ")}` : "";

	const afterSteps = contract.after.map(
		(step) => `${step.method}(${step.args.map(decompileValue).join(", ")})`,
	);
	const whenClause =
		afterSteps.length > 0 ? `\n\twhen ${afterSteps.join(", ")}` : "";

	lines.push(
		`contract ${contract.name} on ${contract.port} ${q(contract.description)}${givenClause}${whenClause}`,
	);
	lines.push(`\tthen ${decompileCondition(contract.then)}`);

	return lines;
};

// =============================================================================
// Condition Expressions
// =============================================================================

const decompileCondition = (cond: ConditionExpr): string => {
	switch (cond.kind) {
		case "and": {
			return cond.conditions.map(decompileCondition).join(" && ");
		}
		case "contains": {
			return `${decompileValue(cond.collection)} contains ${decompileValue(cond.value)}`;
		}
		case "equals": {
			return `${decompileValue(cond.left)} == ${decompileValue(cond.right)}`;
		}
		case "exists": {
			return `exists ${cond.variable} in ${decompileValue(cond.collection)}: ${decompileCondition(cond.condition)}`;
		}
		case "forAll": {
			return `forall ${cond.variable} in ${decompileValue(cond.collection)}: ${decompileCondition(cond.condition)}`;
		}
		case "greaterThan": {
			return `${decompileValue(cond.left)} > ${decompileValue(cond.right)}`;
		}
		case "greaterThanOrEqual": {
			return `${decompileValue(cond.left)} >= ${decompileValue(cond.right)}`;
		}
		case "implies": {
			return `if ${decompileCondition(cond.if)} then ${decompileCondition(cond.then)}`;
		}
		case "lessThan": {
			return `${decompileValue(cond.left)} < ${decompileValue(cond.right)}`;
		}
		case "lessThanOrEqual": {
			return `${decompileValue(cond.left)} <= ${decompileValue(cond.right)}`;
		}
		case "not": {
			return `!${decompileCondition(cond.condition)}`;
		}
		case "notEquals": {
			return `${decompileValue(cond.left)} != ${decompileValue(cond.right)}`;
		}
		case "or": {
			return cond.conditions.map(decompileCondition).join(" || ");
		}
	}
};

const decompileValue = (value: ValueExpr): string => {
	switch (value.kind) {
		case "call": {
			const call = `${value.name}(${value.args.map(decompileValue).join(", ")})`;
			return value.field ? `${call}.${value.field}` : call;
		}
		case "count": {
			return `count(${decompileValue(value.collection)})`;
		}
		case "field": {
			return value.path;
		}
		case "literal": {
			return typeof value.value === "string"
				? q(value.value)
				: String(value.value);
		}
		case "variable": {
			return value.name;
		}
	}
};

// =============================================================================
// Subscriber
// =============================================================================

const decompileSubscriber = (name: string, sub: SubscriberDef): string[] => [
	`subscriber ${name} ${q(sub.description)}`,
	`\ton ${sub.events.join(", ")}`,
];

// =============================================================================
// Port
// =============================================================================

const decompilePort = (name: string, port: PortDef): string[] => {
	const lines: string[] = [];

	const typeParams =
		port.typeParameters && port.typeParameters.length > 0
			? `<${port.typeParameters.map(decompileTypeParameter).join(", ")}>`
			: "";

	lines.push(`port ${name}${typeParams} ${q(port.description)} {`);

	for (const [mName, mDef] of sorted(port.methods)) {
		lines.push(...indent(decompilePortMethod(mName, mDef)));
	}

	lines.push("}");
	return lines;
};

const decompilePortMethod = (name: string, method: PortMethodDef): string[] => {
	const params = sorted(method.params)
		.map(([pName, pDef]) => `${pName}: ${decompileTypeRef(pDef.type)}`)
		.join(", ");
	const throwsPart =
		method.errors.length > 0 ? ` throws ${method.errors.join(", ")}` : "";
	const desc = method.description ? ` ${q(method.description)}` : "";
	return [
		`${name}(${params}): ${decompileTypeRef(method.returns)}${throwsPart}${desc}`,
	];
};

// =============================================================================
// Context Error
// =============================================================================

const decompileContextError = (
	name: string,
	error: ContextErrorDef,
): string[] => {
	const lines: string[] = [];
	lines.push(`error ${name} ${q(error.description)} {`);
	for (const [fName, fDef] of sorted(error.fields)) {
		const opt = fDef.optional ? "?" : "";
		const desc = fDef.description ? ` ${q(fDef.description)}` : "";
		lines.push(`\t${fName}${opt}: ${decompileTypeRef(fDef.type)}${desc}`);
	}
	lines.push("}");
	return lines;
};

// =============================================================================
// Types
// =============================================================================

const decompileTypeDef = (name: string, td: TypeDef): string[] => {
	switch (td.kind) {
		case "alias": {
			return decompileAliasType(name, td);
		}
		case "product": {
			return decompileProductType(name, td);
		}
		case "sum": {
			return decompileSumType(name, td);
		}
	}
};

const decompileProductType = (
	name: string,
	td: Extract<TypeDef, { kind: "product" }>,
): string[] => {
	const typeParams =
		td.typeParameters && td.typeParameters.length > 0
			? `<${td.typeParameters.map(decompileTypeParameter).join(", ")}>`
			: "";
	const lines: string[] = [];
	lines.push(`type ${name}${typeParams} ${q(td.description)} {`);
	for (const [fName, fDef] of sorted(td.fields)) {
		const opt = fDef.optional ? "?" : "";
		lines.push(
			`\t${fName}${opt}: ${decompileTypeRef(fDef.type)} ${q(fDef.description)}`,
		);
	}
	lines.push("}");
	return lines;
};

const decompileSumType = (
	name: string,
	td: Extract<TypeDef, { kind: "sum" }>,
): string[] => {
	const typeParams =
		td.typeParameters && td.typeParameters.length > 0
			? `<${td.typeParameters.map(decompileTypeParameter).join(", ")}>`
			: "";
	const lines: string[] = [];
	lines.push(
		`union ${name}${typeParams} by ${td.discriminator} ${q(td.description)} {`,
	);
	for (const [vName, vDef] of sorted(td.variants)) {
		lines.push(...indent(decompileVariant(vName, vDef)));
	}
	lines.push("}");
	return lines;
};

const decompileVariant = (name: string, v: VariantDef): string[] => {
	const lines: string[] = [];
	if (v.fields && Object.keys(v.fields).length > 0) {
		lines.push(`${name} ${q(v.description)} {`);
		for (const [fName, fDef] of sorted(v.fields)) {
			const opt = fDef.optional ? "?" : "";
			lines.push(
				`\t${fName}${opt}: ${decompileTypeRef(fDef.type)} ${q(fDef.description)}`,
			);
		}
		lines.push("}");
	} else {
		lines.push(`${name} ${q(v.description)}`);
	}
	return lines;
};

const decompileAliasType = (
	name: string,
	td: Extract<TypeDef, { kind: "alias" }>,
): string[] => {
	const typeParams =
		td.typeParameters && td.typeParameters.length > 0
			? `<${td.typeParameters.map(decompileTypeParameter).join(", ")}>`
			: "";
	return [
		`alias ${name}${typeParams} = ${decompileTypeRef(td.type)} ${q(td.description)}`,
	];
};

const decompileTypeParameter = (tp: TypeParameterDef): string => {
	let s = tp.name;
	if (tp.constraint) s += `: ${decompileTypeRef(tp.constraint)}`;
	if (tp.default) s += ` = ${decompileTypeRef(tp.default)}`;
	return s;
};

// =============================================================================
// Shared Clause Helpers
// =============================================================================

type ProfileLookup = ReadonlyMap<string, string>;

const buildProfileLookup = (
	profiles: Record<string, readonly string[]> | undefined,
): ProfileLookup => {
	const lookup = new Map<string, string>();
	if (!profiles) return lookup;
	for (const [name, tags] of Object.entries(profiles)) {
		const key = [...tags].sort().join(",");
		lookup.set(key, name);
	}
	return lookup;
};

const decompileProfiles = (
	profiles: Record<string, readonly string[]>,
): string[] => {
	const lines: string[] = [];
	lines.push("profiles {");
	for (const [name, tags] of sorted(profiles)) {
		const tagString = tags
			.map((t) => (t.startsWith("@") ? t : `@${t}`).replaceAll("-", "_"))
			.join(" ");
		lines.push(`\t${name}: ${tagString}`);
	}
	lines.push("}");
	return lines;
};

const decompileTags = (
	tags: readonly string[],
	profileLookup: ProfileLookup = new Map(),
): string | undefined => {
	if (tags.length === 0) return undefined;

	if (profileLookup.size > 0) {
		const key = [...tags].sort().join(",");
		const profileName = profileLookup.get(key);
		if (profileName) return `#${profileName}`;
	}

	return tags
		.map((t) => (t.startsWith("@") ? t : `@${t}`).replaceAll("-", "_"))
		.join(" ");
};

const decompileUsesClause = (uses: readonly AggregateRef[]): string[] => {
	if (uses.length === 0) return [];
	const parts = uses.map(
		(u) => `${u.access === "read" ? "reads" : "writes"} ${u.aggregate}`,
	);
	return [parts.join(", ")];
};

const decompileInputClause = (input: Record<string, ParamDef>): string[] => {
	const entries = sorted(input);
	if (entries.length === 0) return ["input {}"];
	const lines: string[] = [];
	lines.push("input {");
	for (const [pName, pDef] of entries) {
		const tags: string[] = [];
		if (pDef.sensitive) tags.push("@sensitive");
		for (const tag of tags) lines.push(`\t${tag}`);
		const opt = pDef.optional ? "?" : "";
		lines.push(
			`\t${pName}${opt}: ${decompileTypeRef(pDef.type)} ${q(pDef.description)}`,
		);
	}
	lines.push("}");
	return lines;
};

const decompileErrorsClause = (errors: readonly ErrorDef[]): string[] => {
	const lines: string[] = [];
	lines.push("errors {");
	for (const error of errors) {
		const whenPart = error.when ? ` when ${q(error.when)}` : "";
		lines.push(`\t${error.name} ${q(error.description)}${whenPart}`);
	}
	lines.push("}");
	return lines;
};

// =============================================================================
// Utilities
// =============================================================================

const q = (s: string): string =>
	`"${s.replaceAll("\\", "\\\\").replaceAll('"', String.raw`\"`)}"`;

const indent = (lines: string[]): string[] =>
	lines.map((l) => (l === "" ? "" : `\t${l}`));

const sorted = <V>(object: Record<string, V> | undefined): [string, V][] =>
	object ? Object.entries(object).sort(([a], [b]) => a.localeCompare(b)) : [];
