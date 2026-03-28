/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
// Chevrotain CST visitors inherently require non-null assertions (grammar guarantees key presence
// but Record<string, T[]> types can't express that) and any-typed this.visit() returns.
import type { CstNode, IToken } from "chevrotain";

import type {
	AggregateRefAst,
	AliasTypeAst,
	AttributeAst,
	CallExprAst,
	CommandAst,
	ConditionExprAst,
	ConstraintAst,
	ContextAst,
	ContextErrorAst,
	ContractAst,
	ContractBindingAst,
	DomainAst,
	EmittedEventAst,
	EntityAst,
	ErrorRefAst,
	ExtensionEntryAst,
	ExtensionsAst,
	FieldAstDef,
	FunctionDeclAst,
	InvariantAst,
	InvariantScopeAst,
	ParamAst,
	PortAst,
	PortMethodAst,
	PrimitiveTypeAst,
	ProductTypeAst,
	ProfileEntryAst,
	ProfilesAst,
	QueryAst,
	RelationshipAst,
	SubscriberAst,
	SumTypeAst,
	TagAst,
	TypeDeclAst,
	TypeExprAst,
	TypeParameterAst,
	ValueExprAst,
	ValueObjectAst,
	VariantAst,
} from "./ast";

import { morphParser } from "./parser";
import {
	findFirstToken,
	findLastToken,
	rangeFromToken,
	rangeFromTokens,
	stripQuotes,
	tokenImage,
} from "./visitor-helpers";

const BaseCstVisitor = morphParser.getBaseCstVisitorConstructor();

// =============================================================================
// CST Visitor
// =============================================================================

class MorphCstVisitor extends BaseCstVisitor {
	constructor() {
		super();
		this.validateVisitor();
	}

	domain(context: Record<string, (CstNode | IToken)[]>): DomainAst {
		const nameToken = context["IdentifierName"]![0] as IToken;
		const domainToken = context["Domain"]![0] as IToken;
		const extensions = context["extensionsBlock"]
			? this.visit(context["extensionsBlock"][0] as CstNode)
			: undefined;
		const profiles: ProfilesAst | undefined = context["profilesBlock"]
			? this.visit(context["profilesBlock"][0] as CstNode)
			: undefined;
		const contexts = (context["contextBlock"] ?? []).map((c) =>
			this.visit(c as CstNode),
		);

		const lastToken =
			contexts.length > 0
				? findLastToken(
						context["contextBlock"]![context["contextBlock"]!.length - 1]!,
					)
				: profiles
					? findLastToken(context["profilesBlock"]![0]!)
					: extensions
						? findLastToken(context["extensionsBlock"]![0]!)
						: nameToken;

		return {
			name: tokenImage(nameToken),
			extensions,
			...(profiles ? { profiles } : {}),
			contexts,
			range: rangeFromTokens(domainToken, lastToken),
		};
	}

	extensionsBlock(
		context: Record<string, (CstNode | IToken)[]>,
	): ExtensionsAst {
		const entries = (context["extensionEntry"] ?? []).map((entry) =>
			this.visit(entry as CstNode),
		);
		const first = context["Extensions"]![0] as IToken;
		const last = context["RBrace"]![0] as IToken;
		return { entries, range: rangeFromTokens(first, last) };
	}

	extensionEntry(
		context: Record<string, (CstNode | IToken)[]>,
	): ExtensionEntryAst {
		const allIdents = context["IdentifierName"]! as IToken[];
		const nameToken = allIdents[0]!;
		const listNode = context["identifierList"]![0] as CstNode;
		const options = this.visit(listNode) as string[];

		// Default value — second ident if Default keyword present
		const defaultValue = context["Default"]
			? tokenImage(allIdents[allIdents.length - (context["Base"] ? 2 : 1)]!)
			: undefined;
		const baseValue = context["Base"]
			? tokenImage(allIdents.at(-1)!)
			: undefined;

		const lastToken =
			allIdents.length > 1
				? allIdents.at(-1)!
				: (context["RBracket"]![0] as IToken);

		return {
			name: tokenImage(nameToken),
			options,
			...(defaultValue === undefined ? {} : { default: defaultValue }),
			...(baseValue === undefined ? {} : { base: baseValue }),
			range: rangeFromTokens(nameToken, lastToken),
		};
	}

	identifierList(context: Record<string, (CstNode | IToken)[]>): string[] {
		return (context["IdentifierName"]! as IToken[]).map(tokenImage);
	}

	profilesBlock(context: Record<string, (CstNode | IToken)[]>): ProfilesAst {
		const entries = (context["profileEntry"] ?? []).map((entry) =>
			this.visit(entry as CstNode),
		);
		const first = context["Profiles"]![0] as IToken;
		const last = context["RBrace"]![0] as IToken;
		return { entries, range: rangeFromTokens(first, last) };
	}

	profileEntry(context: Record<string, (CstNode | IToken)[]>): ProfileEntryAst {
		const nameToken = context["IdentifierName"]![0] as IToken;
		const tags = (context["tag"] ?? []).map((t) =>
			this.visit(t as CstNode),
		) as TagAst[];
		const lastTag = context["tag"]!.at(-1)!;
		return {
			name: tokenImage(nameToken),
			tags,
			range: rangeFromTokens(nameToken, findLastToken(lastTag)),
		};
	}

	profileRef(context: Record<string, (CstNode | IToken)[]>): TagAst {
		const hashToken = context["Hash"]![0] as IToken;
		const nameToken = context["IdentifierName"]![0] as IToken;
		return {
			name: `#${tokenImage(nameToken)}`,
			range: rangeFromTokens(hashToken, nameToken),
		};
	}

	contextBlock(context: Record<string, (CstNode | IToken)[]>): ContextAst {
		const nameToken = context["IdentifierName"]![0] as IToken;
		const desc = context["StringLiteral"]
			? stripQuotes(tokenImage(context["StringLiteral"][0] as IToken))
			: undefined;

		const entities: EntityAst[] = [];
		const valueObjects: ValueObjectAst[] = [];
		const commands: CommandAst[] = [];
		const queries: QueryAst[] = [];
		const functions: FunctionDeclAst[] = [];
		const invariants: InvariantAst[] = [];
		const contracts: ContractAst[] = [];
		const subscribers: SubscriberAst[] = [];
		const ports: PortAst[] = [];
		const errors: ContextErrorAst[] = [];
		const types: TypeDeclAst[] = [];
		const dependencies: string[] = [];

		for (const member of context["contextMember"] ?? []) {
			const result = this.visit(member as CstNode);
			if (!result) continue;
			switch (result._kind) {
				case "aliasType":
				case "productType":
				case "sumType": {
					types.push(result);
					break;
				}
				case "command": {
					commands.push(result);
					break;
				}
				case "contextError": {
					errors.push(result);
					break;
				}
				case "contract": {
					contracts.push(result);
					break;
				}
				case "depends": {
					dependencies.push(...result.deps);
					break;
				}
				case "entity": {
					entities.push(result);
					break;
				}
				case "function": {
					functions.push(result);
					break;
				}
				case "invariant": {
					invariants.push(result);
					break;
				}
				case "port": {
					ports.push(result);
					break;
				}
				case "query": {
					queries.push(result);
					break;
				}
				case "subscriber": {
					subscribers.push(result);
					break;
				}
				case "valueObject": {
					valueObjects.push(result);
					break;
				}
			}
		}

		return {
			name: tokenImage(nameToken),
			...(desc === undefined ? {} : { description: desc }),
			entities,
			valueObjects,
			commands,
			queries,
			functions,
			invariants,
			contracts,
			subscribers,
			ports,
			errors,
			types,
			dependencies,
			range: rangeFromTokens(
				context["Context"]![0] as IToken,
				context["RBrace"]![0] as IToken,
			),
		};
	}

	contextMember(context: Record<string, (CstNode | IToken)[]>) {
		const tags: TagAst[] = this.visit(context["tagList"]![0] as CstNode);
		if (context["entityDecl"])
			return {
				...this.visit(context["entityDecl"][0] as CstNode, tags),
				_kind: "entity",
			};
		if (context["valueDecl"])
			return {
				...this.visit(context["valueDecl"][0] as CstNode, tags),
				_kind: "valueObject",
			};
		if (context["commandDecl"])
			return {
				...this.visit(context["commandDecl"][0] as CstNode, tags),
				_kind: "command",
			};
		if (context["queryDecl"])
			return {
				...this.visit(context["queryDecl"][0] as CstNode, tags),
				_kind: "query",
			};
		if (context["functionDecl"])
			return {
				...this.visit(context["functionDecl"][0] as CstNode, tags),
				_kind: "function",
			};
		if (context["invariantDecl"])
			return {
				...this.visit(context["invariantDecl"][0] as CstNode, tags),
				_kind: "invariant",
			};
		if (context["contractDecl"])
			return {
				...this.visit(context["contractDecl"][0] as CstNode, tags),
				_kind: "contract",
			};
		if (context["subscriberDecl"])
			return {
				...this.visit(context["subscriberDecl"][0] as CstNode, tags),
				_kind: "subscriber",
			};
		if (context["portDecl"])
			return {
				...this.visit(context["portDecl"][0] as CstNode, tags),
				_kind: "port",
			};
		if (context["contextErrorDecl"])
			return {
				...this.visit(context["contextErrorDecl"][0] as CstNode, tags),
				_kind: "contextError",
			};
		if (context["typeDecl"])
			return {
				...this.visit(context["typeDecl"][0] as CstNode, tags),
				_kind: "productType",
			};
		if (context["unionDecl"])
			return {
				...this.visit(context["unionDecl"][0] as CstNode, tags),
				_kind: "sumType",
			};
		if (context["aliasDecl"])
			return {
				...this.visit(context["aliasDecl"][0] as CstNode, tags),
				_kind: "aliasType",
			};
		if (context["dependsDecl"])
			return this.visit(context["dependsDecl"][0] as CstNode, tags);
		return undefined;
	}

	// =========================================================================
	// Tags
	// =========================================================================

	tagList(context: Record<string, (CstNode | IToken)[]>): TagAst[] {
		const tags = (context["tag"] ?? []).map((t) => this.visit(t as CstNode));
		const profileReferences = (context["profileRef"] ?? []).map((t) =>
			this.visit(t as CstNode),
		);
		return [...tags, ...profileReferences];
	}

	tag(context: Record<string, (CstNode | IToken)[]>): TagAst {
		const atToken = context["At"]![0] as IToken;
		const nameResult = this.visit(context["tagName"]![0] as CstNode) as string;
		const args = context["tagArgList"]
			? (this.visit(context["tagArgList"][0] as CstNode) as string[])
			: undefined;
		const lastToken = context["RParen"]
			? (context["RParen"][0] as IToken)
			: findLastToken(context["tagName"]![0]!);
		return {
			name: nameResult,
			...(args && args.length > 0 ? { args } : {}),
			range: rangeFromTokens(atToken, lastToken),
		};
	}

	tagName(context: Record<string, (CstNode | IToken)[]>): string {
		const token = (context["IdentifierName"]?.[0] ??
			context["Context"]?.[0] ??
			context["Pre"]?.[0] ??
			context["Post"]?.[0]) as IToken;
		return tokenImage(token);
	}

	tagArgList(context: Record<string, (CstNode | IToken)[]>): string[] {
		return (context["tagArg"] ?? []).map(
			(a) => this.visit(a as CstNode) as string,
		);
	}

	tagArg(context: Record<string, (CstNode | IToken)[]>): string {
		if (context["StringLiteral"])
			return stripQuotes(tokenImage(context["StringLiteral"][0] as IToken));
		if (context["IdentifierName"])
			return tokenImage(context["IdentifierName"][0] as IToken);
		if (context["NumberLiteral"]) {
			const nums = context["NumberLiteral"] as IToken[];
			if (context["DotDot"]) {
				return `${tokenImage(nums[0]!)}..${tokenImage(nums[1]!)}`;
			}
			return tokenImage(nums[0]!);
		}
		return "";
	}

	// =========================================================================
	// Entity
	// =========================================================================

	entityDecl(
		context: Record<string, (CstNode | IToken)[]>,
		tags: TagAst[],
	): EntityAst {
		const nameToken = context["IdentifierName"]![0] as IToken;
		const desc = context["StringLiteral"]
			? stripQuotes(tokenImage(context["StringLiteral"][0] as IToken))
			: undefined;
		const members = (context["entityMember"] ?? []).map((m) =>
			this.visit(m as CstNode),
		);
		const attributes = members
			.filter((m: { _kind: string }) => m._kind === "attribute")
			.map((m: { _kind: string }) => {
				const { _kind, ...rest } = m;
				return rest as AttributeAst;
			});
		const relationships = members
			.filter((m: { _kind: string }) => m._kind === "relationship")
			.map((m: { _kind: string }) => {
				const { _kind, ...rest } = m;
				return rest as RelationshipAst;
			});

		return {
			name: tokenImage(nameToken),
			...(desc === undefined ? {} : { description: desc }),
			tags,
			attributes,
			relationships,
			range: rangeFromTokens(
				context["Entity"]![0] as IToken,
				context["RBrace"]![0] as IToken,
			),
		};
	}

	entityMember(context: Record<string, (CstNode | IToken)[]>) {
		if (context["attributeDecl"])
			return {
				...this.visit(context["attributeDecl"][0] as CstNode),
				_kind: "attribute",
			};
		if (context["relationshipDecl"])
			return {
				...this.visit(context["relationshipDecl"][0] as CstNode),
				_kind: "relationship",
			};
		return undefined;
	}

	attributeDecl(context: Record<string, (CstNode | IToken)[]>): AttributeAst {
		const tags: TagAst[] = this.visit(context["tagList"]![0] as CstNode);
		const nameToken = context["IdentifierName"]![0] as IToken;
		const optional = !!context["Question"];
		const type: TypeExprAst = this.visit(context["typeExpr"]![0] as CstNode);
		const desc = context["StringLiteral"]
			? stripQuotes(tokenImage(context["StringLiteral"][0] as IToken))
			: undefined;

		const constraints: ConstraintAst[] = [];
		let sensitive = false;
		for (const tag of tags) {
			switch (tag.name) {
				case "custom": {
					if (tag.args && tag.args.length >= 2) {
						constraints.push({
							kind: "custom",
							name: tag.args[0]!,
							description: tag.args[1]!,
						});
					}
					break;
				}
				case "nonEmpty": {
					constraints.push({ kind: "nonEmpty" });
					break;
				}
				case "pattern": {
					if (tag.args?.[0])
						constraints.push({ kind: "pattern", regex: tag.args[0] });
					break;
				}
				case "positive": {
					constraints.push({ kind: "positive" });
					break;
				}
				case "range": {
					if (tag.args?.[0]) {
						const parts = tag.args[0].split("..");
						const rangeConstraint: ConstraintAst = {
							kind: "range" as const,
							...(parts[0] ? { min: Number(parts[0]) } : {}),
							...(parts[1] ? { max: Number(parts[1]) } : {}),
						};
						constraints.push(rangeConstraint);
					}
					break;
				}
				case "sensitive": {
					sensitive = true;
					break;
				}
				case "unique": {
					constraints.push({ kind: "unique" });
					break;
				}
			}
		}

		const lastToken = context["StringLiteral"]
			? (context["StringLiteral"][0] as IToken)
			: findLastToken(context["typeExpr"]![0]!);

		return {
			name: tokenImage(nameToken),
			type,
			...(desc === undefined ? {} : { description: desc }),
			...(optional ? { optional: true as const } : {}),
			...(constraints.length > 0 ? { constraints } : {}),
			...(sensitive ? { sensitive: true as const } : {}),
			range: rangeFromTokens(nameToken, lastToken),
		};
	}

	relationshipDecl(
		context: Record<string, (CstNode | IToken)[]>,
	): RelationshipAst {
		const kindToken = (context["BelongsTo"]?.[0] ??
			context["HasMany"]?.[0] ??
			context["HasOne"]?.[0] ??
			context["References"]?.[0]) as IToken;
		const kind = tokenImage(kindToken) as RelationshipAst["kind"];
		const target = tokenImage(context["IdentifierName"]![0] as IToken);
		const desc = context["StringLiteral"]
			? stripQuotes(tokenImage(context["StringLiteral"][0] as IToken))
			: undefined;
		const lastToken = context["StringLiteral"]
			? (context["StringLiteral"][0] as IToken)
			: (context["IdentifierName"]![0] as IToken);
		return {
			kind,
			target,
			...(desc === undefined ? {} : { description: desc }),
			range: rangeFromTokens(kindToken, lastToken),
		};
	}

	// =========================================================================
	// Value Object
	// =========================================================================

	valueDecl(
		context: Record<string, (CstNode | IToken)[]>,
		_tags: TagAst[],
	): ValueObjectAst {
		const nameToken = context["IdentifierName"]![0] as IToken;
		const desc = context["StringLiteral"]
			? stripQuotes(tokenImage(context["StringLiteral"][0] as IToken))
			: undefined;
		const attributes = (context["attributeDecl"] ?? []).map((a) =>
			this.visit(a as CstNode),
		);
		return {
			name: tokenImage(nameToken),
			...(desc === undefined ? {} : { description: desc }),
			attributes,
			range: rangeFromTokens(
				context["Value"]![0] as IToken,
				context["RBrace"]![0] as IToken,
			),
		};
	}

	// =========================================================================
	// Command
	// =========================================================================

	commandDecl(
		context: Record<string, (CstNode | IToken)[]>,
		tags: TagAst[],
	): CommandAst {
		const nameToken = context["IdentifierName"]![0] as IToken;
		const desc = context["StringLiteral"]
			? stripQuotes(tokenImage(context["StringLiteral"][0] as IToken))
			: undefined;

		const clauses = this.visitClauses(context["operationClause"]);

		const lastNode = context["operationClause"]
			? context["operationClause"].at(-1)!
			: context["StringLiteral"]
				? context["StringLiteral"][0]!
				: nameToken;

		return {
			name: tokenImage(nameToken),
			...(desc === undefined ? {} : { description: desc }),
			tags,
			uses: clauses.uses,
			...(clauses.pre.length > 0 ? { pre: clauses.pre } : {}),
			...(clauses.post.length > 0 ? { post: clauses.post } : {}),
			input: clauses.input,
			output: clauses.output ?? {
				kind: "primitive",
				name: "void",
				range: rangeFromToken(nameToken),
			},
			emits: clauses.emits,
			errors: clauses.errors,
			range: rangeFromTokens(
				context["Command"]![0] as IToken,
				findLastToken(lastNode),
			),
		};
	}

	// =========================================================================
	// Query
	// =========================================================================

	queryDecl(
		context: Record<string, (CstNode | IToken)[]>,
		tags: TagAst[],
	): QueryAst {
		const nameToken = context["IdentifierName"]![0] as IToken;
		const desc = context["StringLiteral"]
			? stripQuotes(tokenImage(context["StringLiteral"][0] as IToken))
			: undefined;

		const clauses = this.visitClauses(context["operationClause"]);

		const lastNode = context["operationClause"]
			? context["operationClause"].at(-1)!
			: context["StringLiteral"]
				? context["StringLiteral"][0]!
				: nameToken;

		return {
			name: tokenImage(nameToken),
			...(desc === undefined ? {} : { description: desc }),
			tags,
			uses: clauses.uses,
			...(clauses.pre.length > 0 ? { pre: clauses.pre } : {}),
			input: clauses.input,
			output: clauses.output ?? {
				kind: "primitive",
				name: "void",
				range: rangeFromToken(nameToken),
			},
			errors: clauses.errors,
			range: rangeFromTokens(
				context["Query"]![0] as IToken,
				findLastToken(lastNode),
			),
		};
	}

	// =========================================================================
	// Function
	// =========================================================================

	functionDecl(
		context: Record<string, (CstNode | IToken)[]>,
		tags: TagAst[],
	): FunctionDeclAst {
		const nameToken = context["IdentifierName"]![0] as IToken;
		const typeParams = context["typeParameterList"]
			? (this.visit(
					context["typeParameterList"][0] as CstNode,
				) as TypeParameterAst[])
			: undefined;
		const desc = context["StringLiteral"]
			? stripQuotes(tokenImage(context["StringLiteral"][0] as IToken))
			: undefined;

		let input: ParamAst[] = [];
		let output: TypeExprAst = {
			kind: "primitive",
			name: "void",
			range: rangeFromToken(nameToken),
		};
		let errors: ErrorRefAst[] = [];

		for (const clause of context["functionClause"] ?? []) {
			const result = this.visit(clause as CstNode);
			switch (result._clauseKind) {
				case "errors": {
					{
						errors = result.errors;
						// No default
					}
					break;
				}
				case "input": {
					input = result.params;
					break;
				}
				case "output": {
					output = result.type;
					break;
				}
			}
		}

		const lastNode = context["functionClause"]
			? context["functionClause"].at(-1)!
			: context["StringLiteral"]
				? context["StringLiteral"][0]!
				: nameToken;

		return {
			name: tokenImage(nameToken),
			...(desc === undefined ? {} : { description: desc }),
			tags,
			...(typeParams === undefined ? {} : { typeParameters: typeParams }),
			input,
			output,
			errors,
			range: rangeFromTokens(
				context["FunctionKw"]![0] as IToken,
				findLastToken(lastNode),
			),
		};
	}

	functionClause(context: Record<string, (CstNode | IToken)[]>) {
		if (context["inputClause"])
			return {
				...this.visit(context["inputClause"][0] as CstNode),
				_clauseKind: "input",
			};
		if (context["outputClause"])
			return {
				...this.visit(context["outputClause"][0] as CstNode),
				_clauseKind: "output",
			};
		if (context["errorsClause"])
			return {
				...this.visit(context["errorsClause"][0] as CstNode),
				_clauseKind: "errors",
			};
		return {};
	}

	// =========================================================================
	// Operation Clauses (shared by command/query)
	// =========================================================================

	private visitClauses(operationClauses?: (CstNode | IToken)[]) {
		const uses: AggregateRefAst[] = [];
		const pre: string[] = [];
		const post: string[] = [];
		let input: ParamAst[] = [];
		let output: TypeExprAst | undefined;
		const emits: EmittedEventAst[] = [];
		let errors: ErrorRefAst[] = [];

		for (const clause of operationClauses ?? []) {
			const result = this.visit(clause as CstNode);
			if (result.uses) uses.push(...result.uses);
			if (result.pre) pre.push(...result.pre);
			if (result.post) post.push(...result.post);
			if (result.params) input = result.params;
			if (result.type) output = result.type;
			if (result.emits) emits.push(...result.emits);
			if (result.errors) errors = result.errors;
		}

		return { uses, pre, post, input, output, emits, errors };
	}

	operationClause(context: Record<string, (CstNode | IToken)[]>) {
		if (context["usesClause"])
			return this.visit(context["usesClause"][0] as CstNode);
		if (context["preClause"])
			return this.visit(context["preClause"][0] as CstNode);
		if (context["postClause"])
			return this.visit(context["postClause"][0] as CstNode);
		if (context["inputClause"])
			return this.visit(context["inputClause"][0] as CstNode);
		if (context["outputClause"])
			return this.visit(context["outputClause"][0] as CstNode);
		if (context["emitsClause"])
			return this.visit(context["emitsClause"][0] as CstNode);
		if (context["errorsClause"])
			return this.visit(context["errorsClause"][0] as CstNode);
		return {};
	}

	usesClause(context: Record<string, (CstNode | IToken)[]>) {
		const uses = (context["aggregateRef"] ?? []).map((a) =>
			this.visit(a as CstNode),
		);
		return { uses };
	}

	aggregateRef(context: Record<string, (CstNode | IToken)[]>): AggregateRefAst {
		const access = context["Reads"] ? "read" : "write";
		const accessToken = (context["Reads"]?.[0] ??
			context["Writes"]?.[0]) as IToken;
		const aggregate = tokenImage(context["IdentifierName"]![0] as IToken);
		return {
			access,
			aggregate,
			range: rangeFromTokens(
				accessToken,
				context["IdentifierName"]![0] as IToken,
			),
		};
	}

	preClause(context: Record<string, (CstNode | IToken)[]>) {
		return { pre: (context["IdentifierName"]! as IToken[]).map(tokenImage) };
	}

	postClause(context: Record<string, (CstNode | IToken)[]>) {
		return { post: (context["IdentifierName"]! as IToken[]).map(tokenImage) };
	}

	inputClause(context: Record<string, (CstNode | IToken)[]>) {
		const params = (context["paramDecl"] ?? []).map((p) =>
			this.visit(p as CstNode),
		);
		return { params };
	}

	paramDecl(context: Record<string, (CstNode | IToken)[]>): ParamAst {
		const tags: TagAst[] = this.visit(context["tagList"]![0] as CstNode);
		const nameToken = context["IdentifierName"]![0] as IToken;
		const optional = !!context["Question"];
		const type: TypeExprAst = this.visit(context["typeExpr"]![0] as CstNode);
		const desc = context["StringLiteral"]
			? stripQuotes(tokenImage(context["StringLiteral"][0] as IToken))
			: undefined;

		let sensitive = false;
		for (const tag of tags) {
			if (tag.name === "sensitive") sensitive = true;
		}

		const lastToken = context["StringLiteral"]
			? (context["StringLiteral"][0] as IToken)
			: findLastToken(context["typeExpr"]![0]!);

		return {
			name: tokenImage(nameToken),
			type,
			...(desc === undefined ? {} : { description: desc }),
			...(optional ? { optional: true as const } : {}),
			...(sensitive ? { sensitive: true as const } : {}),
			range: rangeFromTokens(nameToken, lastToken),
		};
	}

	outputClause(context: Record<string, (CstNode | IToken)[]>) {
		return {
			type: this.visit(context["typeExpr"]![0] as CstNode) as TypeExprAst,
		};
	}

	emitsClause(context: Record<string, (CstNode | IToken)[]>) {
		const idents = context["IdentifierName"]! as IToken[];
		const strings = (context["StringLiteral"] ?? []) as IToken[];
		const emits: EmittedEventAst[] = [];

		let stringIndex = 0;
		for (const ident of idents) {
			const desc =
				stringIndex < strings.length &&
				strings[stringIndex]!.startOffset > ident.startOffset
					? stripQuotes(tokenImage(strings[stringIndex++]!))
					: undefined;
			emits.push({
				name: tokenImage(ident),
				...(desc === undefined ? {} : { description: desc }),
				range: rangeFromToken(ident),
			});
		}
		return { emits };
	}

	errorsClause(context: Record<string, (CstNode | IToken)[]>) {
		const errors = (context["errorEntry"] ?? []).map((entry) =>
			this.visit(entry as CstNode),
		);
		return { errors };
	}

	errorEntry(context: Record<string, (CstNode | IToken)[]>): ErrorRefAst {
		const nameToken = context["IdentifierName"]![0] as IToken;
		const strings = (context["StringLiteral"] ?? []) as IToken[];
		const desc =
			strings.length > 0 ? stripQuotes(tokenImage(strings[0]!)) : undefined;
		const when =
			context["When"] && strings.length > 1
				? stripQuotes(tokenImage(strings[1]!))
				: undefined;
		const lastToken = strings.length > 0 ? strings.at(-1)! : nameToken;
		return {
			name: tokenImage(nameToken),
			...(desc === undefined ? {} : { description: desc }),
			...(when === undefined ? {} : { when }),
			range: rangeFromTokens(nameToken, lastToken),
		};
	}

	// =========================================================================
	// Invariant
	// =========================================================================

	invariantDecl(
		context: Record<string, (CstNode | IToken)[]>,
		tags: TagAst[],
	): InvariantAst {
		const idents = context["IdentifierName"]! as IToken[];
		const nameToken = idents[0]!;
		const entityName = context["On"] ? tokenImage(idents[1]!) : undefined;
		const strings = (context["StringLiteral"] ?? []) as IToken[];
		const desc =
			strings.length > 0 ? stripQuotes(tokenImage(strings[0]!)) : undefined;
		const viol =
			context["Violation"] && strings.length > 1
				? stripQuotes(tokenImage(strings[1]!))
				: context["Violation"] && strings.length === 1 && !desc
					? stripQuotes(tokenImage(strings[0]!))
					: undefined;

		let scope: InvariantScopeAst = { kind: "global" };
		if (entityName) {
			scope = { kind: "entity", entity: entityName };
		}
		for (const tag of tags) {
			switch (tag.name) {
				case "aggregate": {
					if (tag.args?.[0]) scope = { kind: "aggregate", root: tag.args[0] };
					break;
				}
				case "context": {
					scope = { kind: "context" };
					break;
				}
				case "global": {
					scope = { kind: "global" };
					break;
				}
				case "post": {
					if (tag.args?.[0])
						scope = { kind: "operation", operation: tag.args[0], when: "post" };
					break;
				}
				case "pre": {
					if (tag.args?.[0])
						scope = { kind: "operation", operation: tag.args[0], when: "pre" };
					break;
				}
			}
		}

		const condition: ConditionExprAst = this.visit(
			context["conditionExpr"]![0] as CstNode,
		);

		const lastNode = context["conditionExpr"]![0]!;
		return {
			name: tokenImage(nameToken),
			...(desc === undefined ? {} : { description: desc }),
			tags,
			scope,
			...(viol === undefined ? {} : { violation: viol }),
			condition,
			range: rangeFromTokens(
				context["Invariant"]![0] as IToken,
				findLastToken(lastNode),
			),
		};
	}

	// =========================================================================
	// Contract
	// =========================================================================

	contractDecl(
		context: Record<string, (CstNode | IToken)[]>,
		_tags: TagAst[],
	): ContractAst {
		const idents = context["IdentifierName"]! as IToken[];
		const nameToken = idents[0]!;
		const portToken = idents[1]!;
		const desc = context["StringLiteral"]
			? stripQuotes(tokenImage(context["StringLiteral"][0] as IToken))
			: undefined;
		const bindings: ContractBindingAst[] = context["contractBindingList"]
			? (this.visit(
					context["contractBindingList"][0] as CstNode,
				) as ContractBindingAst[])
			: [];
		const afterSteps: CallExprAst[] = context["contractStepList"]
			? (this.visit(context["contractStepList"][0] as CstNode) as CallExprAst[])
			: [];
		const assertion: ConditionExprAst = this.visit(
			context["conditionExpr"]![0] as CstNode,
		);

		return {
			name: tokenImage(nameToken),
			port: tokenImage(portToken),
			...(desc === undefined ? {} : { description: desc }),
			bindings,
			afterSteps,
			assertion,
			range: rangeFromTokens(
				context["Contract"]![0] as IToken,
				findLastToken(context["conditionExpr"]![0]!),
			),
		};
	}

	contractBindingList(
		context: Record<string, (CstNode | IToken)[]>,
	): ContractBindingAst[] {
		return (context["contractBinding"] ?? []).map(
			(b) => this.visit(b as CstNode) as ContractBindingAst,
		);
	}

	contractBinding(
		context: Record<string, (CstNode | IToken)[]>,
	): ContractBindingAst {
		const idents = context["IdentifierName"]! as IToken[];
		return {
			name: tokenImage(idents[0]!),
			type: tokenImage(idents[1]!),
		};
	}

	contractStepList(
		context: Record<string, (CstNode | IToken)[]>,
	): CallExprAst[] {
		return (context["callExpr"] ?? []).map(
			(c) => this.visit(c as CstNode) as CallExprAst,
		);
	}

	callExpr(context: Record<string, (CstNode | IToken)[]>): CallExprAst {
		const nameToken = context["IdentifierName"]![0] as IToken;
		const args: ValueExprAst[] = context["callArgList"]
			? (this.visit(context["callArgList"][0] as CstNode) as ValueExprAst[])
			: [];
		return {
			kind: "call",
			name: tokenImage(nameToken),
			args,
			range: rangeFromTokens(nameToken, context["RParen"]![0] as IToken),
		};
	}

	callArgList(context: Record<string, (CstNode | IToken)[]>): ValueExprAst[] {
		return (context["valueExpr"] ?? []).map(
			(v) => this.visit(v as CstNode) as ValueExprAst,
		);
	}

	// =========================================================================
	// Subscriber
	// =========================================================================

	subscriberDecl(
		context: Record<string, (CstNode | IToken)[]>,
		_tags: TagAst[],
	): SubscriberAst {
		const idents = context["IdentifierName"]! as IToken[];
		const nameToken = idents[0]!;
		const desc = context["StringLiteral"]
			? stripQuotes(tokenImage(context["StringLiteral"][0] as IToken))
			: undefined;
		// Event names are all identifiers after the first (name) one
		const events = idents.slice(1).map(tokenImage);
		const lastToken = idents.at(-1)!;
		return {
			name: tokenImage(nameToken),
			...(desc === undefined ? {} : { description: desc }),
			events,
			range: rangeFromTokens(context["Subscriber"]![0] as IToken, lastToken),
		};
	}

	// =========================================================================
	// Port
	// =========================================================================

	portDecl(
		context: Record<string, (CstNode | IToken)[]>,
		_tags: TagAst[],
	): PortAst {
		const nameToken = context["IdentifierName"]![0] as IToken;
		const typeParams = context["typeParameterList"]
			? (this.visit(
					context["typeParameterList"][0] as CstNode,
				) as TypeParameterAst[])
			: undefined;
		const desc = context["StringLiteral"]
			? stripQuotes(tokenImage(context["StringLiteral"][0] as IToken))
			: undefined;
		const methods = (context["portMethodDecl"] ?? []).map((m) =>
			this.visit(m as CstNode),
		);
		return {
			name: tokenImage(nameToken),
			...(desc === undefined ? {} : { description: desc }),
			...(typeParams === undefined ? {} : { typeParameters: typeParams }),
			methods,
			range: rangeFromTokens(
				context["Port"]![0] as IToken,
				context["RBrace"]![0] as IToken,
			),
		};
	}

	portMethodDecl(context: Record<string, (CstNode | IToken)[]>): PortMethodAst {
		const idents = context["IdentifierName"]! as IToken[];
		const nameToken = idents[0]!;
		const params = context["portParamList"]
			? (this.visit(context["portParamList"][0] as CstNode) as ParamAst[])
			: [];
		const returns: TypeExprAst = this.visit(context["typeExpr"]![0] as CstNode);
		const throwsErrors = context["Throws"]
			? idents.slice(1).map(tokenImage)
			: undefined;
		const desc = context["StringLiteral"]
			? stripQuotes(tokenImage(context["StringLiteral"][0] as IToken))
			: undefined;
		const lastToken = context["StringLiteral"]
			? (context["StringLiteral"][0] as IToken)
			: findLastToken(context["typeExpr"]![0]!);
		return {
			name: tokenImage(nameToken),
			params,
			returns,
			...(desc === undefined ? {} : { description: desc }),
			...(throwsErrors === undefined ? {} : { throws: throwsErrors }),
			range: rangeFromTokens(nameToken, lastToken),
		};
	}

	portParamList(context: Record<string, (CstNode | IToken)[]>): ParamAst[] {
		return (context["portParam"] ?? []).map((p) => this.visit(p as CstNode));
	}

	portParam(context: Record<string, (CstNode | IToken)[]>): ParamAst {
		const nameToken = context["IdentifierName"]![0] as IToken;
		const type: TypeExprAst = this.visit(context["typeExpr"]![0] as CstNode);
		return {
			name: tokenImage(nameToken),
			type,
			range: rangeFromTokens(
				nameToken,
				findLastToken(context["typeExpr"]![0]!),
			),
		};
	}

	// =========================================================================
	// Context Error
	// =========================================================================

	contextErrorDecl(
		context: Record<string, (CstNode | IToken)[]>,
		_tags: TagAst[],
	): ContextErrorAst {
		const nameToken = context["IdentifierName"]![0] as IToken;
		const desc = context["StringLiteral"]
			? stripQuotes(tokenImage(context["StringLiteral"][0] as IToken))
			: undefined;
		const fields = (context["attributeDecl"] ?? []).map((a) =>
			this.visit(a as CstNode),
		);
		return {
			name: tokenImage(nameToken),
			...(desc === undefined ? {} : { description: desc }),
			fields,
			range: rangeFromTokens(
				context["ErrorKw"]![0] as IToken,
				context["RBrace"]![0] as IToken,
			),
		};
	}

	// =========================================================================
	// Types
	// =========================================================================

	typeDecl(
		context: Record<string, (CstNode | IToken)[]>,
		_tags: TagAst[],
	): ProductTypeAst {
		const nameToken = context["IdentifierName"]![0] as IToken;
		const typeParams = context["typeParameterList"]
			? (this.visit(
					context["typeParameterList"][0] as CstNode,
				) as TypeParameterAst[])
			: undefined;
		const desc = context["StringLiteral"]
			? stripQuotes(tokenImage(context["StringLiteral"][0] as IToken))
			: undefined;
		const fields = (context["fieldDecl"] ?? []).map((f) =>
			this.visit(f as CstNode),
		);
		return {
			kind: "product",
			name: tokenImage(nameToken),
			...(desc === undefined ? {} : { description: desc }),
			...(typeParams === undefined ? {} : { typeParameters: typeParams }),
			fields,
			range: rangeFromTokens(
				context["TypeKw"]![0] as IToken,
				context["RBrace"]![0] as IToken,
			),
		};
	}

	unionDecl(
		context: Record<string, (CstNode | IToken)[]>,
		_tags: TagAst[],
	): SumTypeAst {
		const idents = context["IdentifierName"]! as IToken[];
		const nameToken = idents[0]!;
		const discriminator = tokenImage(idents[1]!);
		const typeParams = context["typeParameterList"]
			? (this.visit(
					context["typeParameterList"][0] as CstNode,
				) as TypeParameterAst[])
			: undefined;
		const desc = context["StringLiteral"]
			? stripQuotes(tokenImage(context["StringLiteral"][0] as IToken))
			: undefined;
		const variants = (context["variantDecl"] ?? []).map((v) =>
			this.visit(v as CstNode),
		);
		return {
			kind: "sum",
			name: tokenImage(nameToken),
			...(desc === undefined ? {} : { description: desc }),
			discriminator,
			...(typeParams === undefined ? {} : { typeParameters: typeParams }),
			variants,
			range: rangeFromTokens(
				context["Union"]![0] as IToken,
				context["RBrace"]![0] as IToken,
			),
		};
	}

	variantDecl(context: Record<string, (CstNode | IToken)[]>): VariantAst {
		const name = this.visit(context["variantName"]![0] as CstNode) as string;
		const nameNode = context["variantName"]![0]!;
		const desc = context["StringLiteral"]
			? stripQuotes(tokenImage(context["StringLiteral"][0] as IToken))
			: undefined;
		const fields = context["fieldDecl"]
			? (context["fieldDecl"] as CstNode[]).map((f) => this.visit(f))
			: undefined;
		const lastToken = context["RBrace"]
			? (context["RBrace"][0] as IToken)
			: ((context["StringLiteral"]?.[0] ?? findLastToken(nameNode)) as IToken);
		return {
			name,
			...(desc === undefined ? {} : { description: desc }),
			...(fields === undefined ? {} : { fields }),
			range: rangeFromTokens(findFirstToken(nameNode), lastToken),
		};
	}

	variantName(context: Record<string, (CstNode | IToken)[]>): string {
		const token = Object.values(context).flat()[0] as IToken;
		return tokenImage(token);
	}

	fieldDecl(context: Record<string, (CstNode | IToken)[]>): FieldAstDef {
		const name = this.visit(context["fieldName"]![0] as CstNode) as string;
		const nameNode = context["fieldName"]![0]!;
		const optional = !!context["Question"];
		const type: TypeExprAst = this.visit(context["typeExpr"]![0] as CstNode);
		const desc = context["StringLiteral"]
			? stripQuotes(tokenImage(context["StringLiteral"][0] as IToken))
			: undefined;
		const lastToken = context["StringLiteral"]
			? (context["StringLiteral"][0] as IToken)
			: findLastToken(context["typeExpr"]![0]!);
		return {
			name,
			type,
			...(desc === undefined ? {} : { description: desc }),
			...(optional ? { optional: true as const } : {}),
			range: rangeFromTokens(findFirstToken(nameNode), lastToken),
		};
	}

	fieldName(context: Record<string, (CstNode | IToken)[]>): string {
		const token = Object.values(context).flat()[0] as IToken;
		return tokenImage(token);
	}

	aliasDecl(
		context: Record<string, (CstNode | IToken)[]>,
		_tags: TagAst[],
	): AliasTypeAst {
		const nameToken = context["IdentifierName"]![0] as IToken;
		const typeParams = context["typeParameterList"]
			? (this.visit(
					context["typeParameterList"][0] as CstNode,
				) as TypeParameterAst[])
			: undefined;
		const type: TypeExprAst = this.visit(context["typeExpr"]![0] as CstNode);
		const desc = context["StringLiteral"]
			? stripQuotes(tokenImage(context["StringLiteral"][0] as IToken))
			: undefined;
		const lastToken = context["StringLiteral"]
			? (context["StringLiteral"][0] as IToken)
			: findLastToken(context["typeExpr"]![0]!);
		return {
			kind: "alias",
			name: tokenImage(nameToken),
			...(desc === undefined ? {} : { description: desc }),
			...(typeParams === undefined ? {} : { typeParameters: typeParams }),
			type,
			range: rangeFromTokens(context["Alias"]![0] as IToken, lastToken),
		};
	}

	// =========================================================================
	// Type Parameters
	// =========================================================================

	typeParameterList(
		context: Record<string, (CstNode | IToken)[]>,
	): TypeParameterAst[] {
		return (context["typeParameter"] ?? []).map((tp) =>
			this.visit(tp as CstNode),
		);
	}

	typeParameter(
		context: Record<string, (CstNode | IToken)[]>,
	): TypeParameterAst {
		const nameToken = context["IdentifierName"]![0] as IToken;
		const typeExprs = (context["typeExpr"] ?? []) as CstNode[];
		const constraint = context["Colon"]
			? (this.visit(typeExprs[0]!) as TypeExprAst)
			: undefined;
		const defaultType = context["Equals"]
			? (this.visit(typeExprs[context["Colon"] ? 1 : 0]!) as TypeExprAst)
			: undefined;
		const lastExpr = typeExprs.at(-1);
		const lastToken = lastExpr ? findLastToken(lastExpr) : nameToken;
		return {
			name: tokenImage(nameToken),
			...(constraint === undefined ? {} : { constraint }),
			...(defaultType === undefined ? {} : { default: defaultType }),
			range: rangeFromTokens(nameToken, lastToken),
		};
	}

	// =========================================================================
	// Dependencies
	// =========================================================================

	dependsDecl(context: Record<string, (CstNode | IToken)[]>, _tags: TagAst[]) {
		const deps = (context["IdentifierName"]! as IToken[]).map(tokenImage);
		return { _kind: "depends", deps };
	}

	// =========================================================================
	// Type Expressions
	// =========================================================================

	typeExpr(context: Record<string, (CstNode | IToken)[]>): TypeExprAst {
		const primary: TypeExprAst = this.visit(
			context["primaryTypeExpr"]![0] as CstNode,
		);
		let result = primary;
		if (context["LBracket"]) {
			result = {
				kind: "array",
				element: primary,
				range: rangeFromTokens(
					findFirstToken(context["primaryTypeExpr"]![0]!),
					context["RBracket"]![0] as IToken,
				),
			};
		}
		if (context["Question"]) {
			const lastToken = context["Question"][0] as IToken;
			result = {
				kind: "optional",
				inner: result,
				range: rangeFromTokens(
					findFirstToken(context["primaryTypeExpr"]![0]!),
					lastToken,
				),
			};
		}
		return result;
	}

	primaryTypeExpr(context: Record<string, (CstNode | IToken)[]>): TypeExprAst {
		// Function type: (params) => returnType
		if (context["LParen"] && context["FatArrow"]) {
			const params = context["functionParamList"]
				? (this.visit(context["functionParamList"][0] as CstNode) as ParamAst[])
				: [];
			const returns: TypeExprAst = this.visit(
				context["typeExpr"]![0] as CstNode,
			);
			return {
				kind: "function",
				params: params.map((p) => ({ name: p.name, type: p.type })),
				returns,
				range: rangeFromTokens(
					context["LParen"][0] as IToken,
					findLastToken(context["typeExpr"]![0]!),
				),
			};
		}

		// String union: "a" | "b" | "c"
		if (context["stringUnionType"]) {
			return this.visit(context["stringUnionType"][0] as CstNode);
		}

		// Identifier-based types
		const ident = context["IdentifierName"]?.[0] as IToken | undefined;
		if (!ident) {
			return {
				kind: "primitive",
				name: "unknown",
				range: {
					start: { line: 0, column: 0, offset: 0 },
					end: { line: 0, column: 0, offset: 0 },
				},
			};
		}

		const name = tokenImage(ident);

		// Entity.id
		if (context["Dot"]) {
			const idToken = (context["IdentifierName"] as IToken[])[1]!;
			return {
				kind: "entityId",
				entity: name,
				range: rangeFromTokens(ident, idToken),
			};
		}

		// Generic<T, U>
		if (context["LessThan"]) {
			const args: TypeExprAst[] = this.visit(
				context["typeArgList"]![0] as CstNode,
			);
			return {
				kind: "generic",
				name,
				args,
				range: rangeFromTokens(ident, context["GreaterThan"]![0] as IToken),
			};
		}

		// Primitive or named type
		const primitives = new Set([
			"boolean",
			"date",
			"datetime",
			"float",
			"integer",
			"string",
			"unknown",
			"void",
		]);
		if (primitives.has(name)) {
			return {
				kind: "primitive",
				name: name as PrimitiveTypeAst["name"],
				range: rangeFromToken(ident),
			};
		}

		return {
			kind: "named",
			name,
			range: rangeFromToken(ident),
		};
	}

	stringUnionType(context: Record<string, (CstNode | IToken)[]>): TypeExprAst {
		const strings = context["StringLiteral"]! as IToken[];
		const values = strings.map((s) => stripQuotes(tokenImage(s)));
		return {
			kind: "union",
			values,
			range: rangeFromTokens(strings[0]!, strings.at(-1)!),
		};
	}

	functionParamList(context: Record<string, (CstNode | IToken)[]>): ParamAst[] {
		return (context["portParam"] ?? []).map((p) => this.visit(p as CstNode));
	}

	typeArgList(context: Record<string, (CstNode | IToken)[]>): TypeExprAst[] {
		return (context["typeExpr"] ?? []).map((t) => this.visit(t as CstNode));
	}

	// =========================================================================
	// Condition Expressions
	// =========================================================================

	conditionExpr(
		context: Record<string, (CstNode | IToken)[]>,
	): ConditionExprAst {
		return this.visit(context["orExpr"]![0] as CstNode);
	}

	orExpr(context: Record<string, (CstNode | IToken)[]>): ConditionExprAst {
		const ands = (context["andExpr"] ?? []).map(
			(a) => this.visit(a as CstNode) as ConditionExprAst,
		);
		if (ands.length === 1) return ands[0]!;
		return {
			kind: "or",
			conditions: ands,
			range: rangeFromTokens(
				findFirstToken(context["andExpr"]![0]!),
				findLastToken(context["andExpr"]![context["andExpr"]!.length - 1]!),
			),
		};
	}

	andExpr(context: Record<string, (CstNode | IToken)[]>): ConditionExprAst {
		const nots = (context["notExpr"] ?? []).map(
			(n) => this.visit(n as CstNode) as ConditionExprAst,
		);
		if (nots.length === 1) return nots[0]!;
		return {
			kind: "and",
			conditions: nots,
			range: rangeFromTokens(
				findFirstToken(context["notExpr"]![0]!),
				findLastToken(context["notExpr"]![context["notExpr"]!.length - 1]!),
			),
		};
	}

	notExpr(context: Record<string, (CstNode | IToken)[]>): ConditionExprAst {
		if (context["Not"]) {
			const inner: ConditionExprAst = this.visit(
				context["notExpr"]![0] as CstNode,
			);
			return {
				kind: "not",
				condition: inner,
				range: rangeFromTokens(
					context["Not"][0] as IToken,
					findLastToken(context["notExpr"]![0]!),
				),
			};
		}
		return this.visit(context["primaryCondition"]![0] as CstNode);
	}

	primaryCondition(
		context: Record<string, (CstNode | IToken)[]>,
	): ConditionExprAst {
		if (context["If"]) {
			const conds = context["conditionExpr"] as CstNode[];
			const ifCond: ConditionExprAst = this.visit(conds[0]!);
			const thenCond: ConditionExprAst = this.visit(conds[1]!);
			return {
				kind: "implies",
				if: ifCond,
				then: thenCond,
				range: rangeFromTokens(
					context["If"][0] as IToken,
					findLastToken(conds[1]!),
				),
			};
		}

		if (context["Exists"]) {
			const variable = tokenImage(context["IdentifierName"]![0] as IToken);
			const collection: ValueExprAst = this.visit(
				context["valueExpr"]![0] as CstNode,
			);
			const condition: ConditionExprAst = this.visit(
				context["conditionExpr"]![0] as CstNode,
			);
			return {
				kind: "exists",
				variable,
				collection,
				condition,
				range: rangeFromTokens(
					context["Exists"][0] as IToken,
					findLastToken(context["conditionExpr"]![0]!),
				),
			};
		}

		if (context["Forall"]) {
			const variable = tokenImage(context["IdentifierName"]![0] as IToken);
			const collection: ValueExprAst = this.visit(
				context["valueExpr"]![0] as CstNode,
			);
			const condition: ConditionExprAst = this.visit(
				context["conditionExpr"]![0] as CstNode,
			);
			return {
				kind: "forAll",
				variable,
				collection,
				condition,
				range: rangeFromTokens(
					context["Forall"][0] as IToken,
					findLastToken(context["conditionExpr"]![0]!),
				),
			};
		}

		if (context["LParen"]) {
			return this.visit(context["conditionExpr"]![0] as CstNode);
		}

		return this.visit(context["comparison"]![0] as CstNode);
	}

	comparison(context: Record<string, (CstNode | IToken)[]>): ConditionExprAst {
		const left: ValueExprAst = this.visit(context["valueExpr"]![0] as CstNode);

		if (context["Contains"]) {
			const value: ValueExprAst = this.visit(
				context["valueExpr"]![1] as CstNode,
			);
			return {
				kind: "contains",
				collection: left,
				value,
				range: rangeFromTokens(
					findFirstToken(context["valueExpr"]![0]!),
					findLastToken(context["valueExpr"]![1]!),
				),
			};
		}

		const opResult = this.visit(
			context["comparisonOp"]![0] as CstNode,
		) as string;
		const right: ValueExprAst = this.visit(context["valueExpr"]![1] as CstNode);

		const kindMap: Record<string, ConditionExprAst["kind"]> = {
			"==": "equals",
			"!=": "notEquals",
			">": "greaterThan",
			">=": "greaterThanOrEqual",
			"<": "lessThan",
			"<=": "lessThanOrEqual",
		};

		return {
			kind: kindMap[opResult]!,
			left,
			right,
			range: rangeFromTokens(
				findFirstToken(context["valueExpr"]![0]!),
				findLastToken(context["valueExpr"]![1]!),
			),
		} as ConditionExprAst;
	}

	comparisonOp(context: Record<string, (CstNode | IToken)[]>): string {
		if (context["DoubleEquals"]) return "==";
		if (context["NotEquals"]) return "!=";
		if (context["GreaterThanOrEqual"]) return ">=";
		if (context["LessThanOrEqual"]) return "<=";
		if (context["GreaterThan"]) return ">";
		if (context["LessThan"]) return "<";
		return "==";
	}

	// =========================================================================
	// Value Expressions
	// =========================================================================

	valueExpr(context: Record<string, (CstNode | IToken)[]>): ValueExprAst {
		if (context["Count"]) {
			const inner: ValueExprAst = this.visit(
				context["valueExpr"]![0] as CstNode,
			);
			return {
				kind: "count",
				collection: inner,
				range: rangeFromTokens(
					context["Count"][0] as IToken,
					context["RParen"]![0] as IToken,
				),
			};
		}
		if (context["NumberLiteral"]) {
			const token = context["NumberLiteral"][0] as IToken;
			return {
				kind: "literal",
				value: Number(tokenImage(token)),
				range: rangeFromToken(token),
			};
		}
		if (context["StringLiteral"]) {
			const token = context["StringLiteral"][0] as IToken;
			return {
				kind: "literal",
				value: stripQuotes(tokenImage(token)),
				range: rangeFromToken(token),
			};
		}
		if (context["True"]) {
			return {
				kind: "literal",
				value: true,
				range: rangeFromToken(context["True"][0] as IToken),
			};
		}
		if (context["False"]) {
			return {
				kind: "literal",
				value: false,
				range: rangeFromToken(context["False"][0] as IToken),
			};
		}
		if (context["Null"]) {
			return {
				kind: "literal",
				value: undefined,
				range: rangeFromToken(context["Null"][0] as IToken),
			};
		}

		const identOrKws = context["identOrKeyword"] as CstNode[] | undefined;
		if (identOrKws && identOrKws.length > 0) {
			if (context["LParen"]) {
				const name = this.visit(identOrKws[0]!) as string;
				const args: ValueExprAst[] = context["callArgList"]
					? (this.visit(context["callArgList"][0] as CstNode) as ValueExprAst[])
					: [];
				const tailParts = identOrKws
					.slice(1)
					.map((node) => this.visit(node) as string);
				const field = tailParts.length > 0 ? tailParts.join(".") : undefined;
				const lastToken = field
					? findLastToken(identOrKws.at(-1)!)
					: (context["RParen"]![0] as IToken);
				return {
					kind: "call",
					name,
					args,
					field,
					range: rangeFromTokens(findFirstToken(identOrKws[0]!), lastToken),
				} satisfies CallExprAst;
			}
			const parts = identOrKws.map((node) => this.visit(node) as string);
			return {
				kind: "field",
				path: parts.join("."),
				range: rangeFromTokens(
					findFirstToken(identOrKws[0]!),
					findLastToken(identOrKws.at(-1)!),
				),
			};
		}

		return {
			kind: "field",
			path: "",
			range: {
				start: { line: 0, column: 0, offset: 0 },
				end: { line: 0, column: 0, offset: 0 },
			},
		};
	}

	identOrKeyword(context: Record<string, (CstNode | IToken)[]>): string {
		const token = Object.values(context).flat()[0] as IToken;
		return tokenImage(token);
	}
}

export const morphVisitor = new MorphCstVisitor();
