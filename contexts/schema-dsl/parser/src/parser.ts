import { CstParser } from "chevrotain";

import {
	Alias,
	allTokens,
	And,
	At,
	Auth,
	Base,
	Hash,
	BelongsTo,
	By,
	Colon,
	Comma,
	Command,
	Contains,
	Context,
	Contract,
	Count,
	Default,
	Depends,
	Domain,
	Dot,
	DotDot,
	DoubleEquals,
	Emits,
	Entity,
	Equals,
	ErrorKw,
	Errors,
	EventStore,
	Exists,
	Extensions,
	False,
	FatArrow,
	Forall,
	FunctionKw,
	Given,
	GreaterThan,
	GreaterThanOrEqual,
	HasMany,
	HasOne,
	I18n,
	IdentifierName,
	If,
	In,
	Input,
	Invariant,
	LBrace,
	LBracket,
	LessThan,
	LessThanOrEqual,
	LParen,
	Not,
	NotEquals,
	Null,
	NumberLiteral,
	On,
	Or,
	Output,
	Pipe,
	Port,
	Post,
	Pre,
	Profiles,
	Query,
	Question,
	RBrace,
	RBracket,
	Reads,
	References,
	RParen,
	Sse,
	Storage,
	StringLiteral,
	Subscriber,
	Then,
	Throws,
	True,
	TypeKw,
	Union,
	Value,
	Violation,
	When,
	Where,
	Writes,
} from "./lexer";

export class MorphParser extends CstParser {
	constructor() {
		super(allTokens, {
			recoveryEnabled: true,
			nodeLocationTracking: "full",
		});
		this.performSelfAnalysis();
	}

	// =========================================================================
	// Top-level
	// =========================================================================

	domain = this.RULE("domain", () => {
		this.CONSUME(Domain);
		this.CONSUME(IdentifierName);
		this.OPTION(() => {
			this.SUBRULE(this.extensionsBlock);
		});
		this.OPTION2(() => {
			this.SUBRULE(this.profilesBlock);
		});
		this.MANY(() => {
			this.SUBRULE(this.contextBlock);
		});
	});

	// =========================================================================
	// Extensions
	// =========================================================================

	extensionsBlock = this.RULE("extensionsBlock", () => {
		this.CONSUME(Extensions);
		this.CONSUME(LBrace);
		this.MANY(() => {
			this.SUBRULE(this.extensionEntry);
		});
		this.CONSUME(RBrace);
	});

	extensionEntry = this.RULE("extensionEntry", () => {
		this.CONSUME(IdentifierName);
		this.CONSUME(LBracket);
		this.SUBRULE(this.identifierList);
		this.CONSUME(RBracket);
		this.OPTION(() => {
			this.CONSUME(Default);
			this.CONSUME2(IdentifierName);
		});
		this.OPTION2(() => {
			this.CONSUME(Base);
			this.CONSUME3(IdentifierName);
		});
	});

	identifierList = this.RULE("identifierList", () => {
		this.CONSUME(IdentifierName);
		this.MANY(() => {
			this.CONSUME(Comma);
			this.CONSUME2(IdentifierName);
		});
	});

	// =========================================================================
	// Profiles
	// =========================================================================

	profilesBlock = this.RULE("profilesBlock", () => {
		this.CONSUME(Profiles);
		this.CONSUME(LBrace);
		this.MANY(() => {
			this.SUBRULE(this.profileEntry);
		});
		this.CONSUME(RBrace);
	});

	profileEntry = this.RULE("profileEntry", () => {
		this.CONSUME(IdentifierName);
		this.CONSUME(Colon);
		this.AT_LEAST_ONE(() => {
			this.SUBRULE(this.tag);
		});
	});

	// =========================================================================
	// Context
	// =========================================================================

	contextBlock = this.RULE("contextBlock", () => {
		this.CONSUME(Context);
		this.CONSUME(IdentifierName);
		this.OPTION(() => {
			this.CONSUME(StringLiteral);
		});
		this.CONSUME(LBrace);
		this.MANY(() => {
			this.SUBRULE(this.contextMember);
		});
		this.CONSUME(RBrace);
	});

	contextMember = this.RULE("contextMember", () => {
		this.SUBRULE(this.tagList);
		this.OR([
			{ ALT: () => this.SUBRULE(this.entityDecl) },
			{ ALT: () => this.SUBRULE(this.valueDecl) },
			{ ALT: () => this.SUBRULE(this.commandDecl) },
			{ ALT: () => this.SUBRULE(this.queryDecl) },
			{ ALT: () => this.SUBRULE(this.functionDecl) },
			{ ALT: () => this.SUBRULE(this.invariantDecl) },
			{ ALT: () => this.SUBRULE(this.contractDecl) },
			{ ALT: () => this.SUBRULE(this.subscriberDecl) },
			{ ALT: () => this.SUBRULE(this.portDecl) },
			{ ALT: () => this.SUBRULE(this.contextErrorDecl) },
			{ ALT: () => this.SUBRULE(this.typeDecl) },
			{ ALT: () => this.SUBRULE(this.unionDecl) },
			{ ALT: () => this.SUBRULE(this.aliasDecl) },
			{ ALT: () => this.SUBRULE(this.dependsDecl) },
		]);
	});

	// =========================================================================
	// Tags
	// =========================================================================

	tagList = this.RULE("tagList", () => {
		this.MANY(() => {
			this.OR([
				{ ALT: () => this.SUBRULE(this.tag) },
				{ ALT: () => this.SUBRULE(this.profileRef) },
			]);
		});
	});

	profileRef = this.RULE("profileRef", () => {
		this.CONSUME(Hash);
		this.CONSUME(IdentifierName);
	});

	tag = this.RULE("tag", () => {
		this.CONSUME(At);
		this.SUBRULE(this.tagName);
		this.OPTION(() => {
			this.CONSUME(LParen);
			this.SUBRULE(this.tagArgList);
			this.CONSUME(RParen);
		});
	});

	tagName = this.RULE("tagName", () => {
		this.CONSUME(IdentifierName);
	});

	tagArgList = this.RULE("tagArgList", () => {
		this.SUBRULE(this.tagArg);
		this.MANY(() => {
			this.CONSUME(Comma);
			this.SUBRULE2(this.tagArg);
		});
	});

	tagArg = this.RULE("tagArg", () => {
		this.OR([
			{ ALT: () => this.CONSUME(StringLiteral) },
			{ ALT: () => this.CONSUME(IdentifierName) },
			{
				ALT: () => {
					this.CONSUME(NumberLiteral);
					this.OPTION(() => {
						this.CONSUME(DotDot);
						this.CONSUME2(NumberLiteral);
					});
				},
			},
		]);
	});

	// =========================================================================
	// Entity
	// =========================================================================

	entityDecl = this.RULE("entityDecl", () => {
		this.CONSUME(Entity);
		this.CONSUME(IdentifierName);
		this.OPTION(() => {
			this.CONSUME(StringLiteral);
		});
		this.CONSUME(LBrace);
		this.MANY(() => {
			this.SUBRULE(this.entityMember);
		});
		this.CONSUME(RBrace);
	});

	entityMember = this.RULE("entityMember", () => {
		this.OR([
			{ ALT: () => this.SUBRULE(this.attributeDecl) },
			{ ALT: () => this.SUBRULE(this.relationshipDecl) },
		]);
	});

	attributeDecl = this.RULE("attributeDecl", () => {
		this.SUBRULE(this.tagList);
		this.CONSUME(IdentifierName);
		this.OPTION(() => {
			this.CONSUME(Question);
		});
		this.CONSUME(Colon);
		this.SUBRULE(this.typeExpr);
		this.OPTION2(() => {
			this.CONSUME(StringLiteral);
		});
	});

	relationshipDecl = this.RULE("relationshipDecl", () => {
		this.OR([
			{ ALT: () => this.CONSUME(BelongsTo) },
			{ ALT: () => this.CONSUME(HasMany) },
			{ ALT: () => this.CONSUME(HasOne) },
			{ ALT: () => this.CONSUME(References) },
		]);
		this.CONSUME(IdentifierName);
		this.OPTION(() => {
			this.CONSUME(StringLiteral);
		});
	});

	// =========================================================================
	// Value Object
	// =========================================================================

	valueDecl = this.RULE("valueDecl", () => {
		this.CONSUME(Value);
		this.CONSUME(IdentifierName);
		this.OPTION(() => {
			this.CONSUME(StringLiteral);
		});
		this.CONSUME(LBrace);
		this.MANY(() => {
			this.SUBRULE(this.attributeDecl);
		});
		this.CONSUME(RBrace);
	});

	// =========================================================================
	// Command
	// =========================================================================

	commandDecl = this.RULE("commandDecl", () => {
		this.CONSUME(Command);
		this.CONSUME(IdentifierName);
		this.OPTION(() => {
			this.CONSUME(StringLiteral);
		});
		this.MANY(() => {
			this.SUBRULE(this.operationClause);
		});
	});

	operationClause = this.RULE("operationClause", () => {
		this.OR([
			{ ALT: () => this.SUBRULE(this.usesClause) },
			{ ALT: () => this.SUBRULE(this.preClause) },
			{ ALT: () => this.SUBRULE(this.postClause) },
			{ ALT: () => this.SUBRULE(this.inputClause) },
			{ ALT: () => this.SUBRULE(this.outputClause) },
			{ ALT: () => this.SUBRULE(this.emitsClause) },
			{ ALT: () => this.SUBRULE(this.errorsClause) },
		]);
	});

	usesClause = this.RULE("usesClause", () => {
		this.SUBRULE(this.aggregateRef);
		this.MANY(() => {
			this.CONSUME(Comma);
			this.SUBRULE2(this.aggregateRef);
		});
	});

	aggregateRef = this.RULE("aggregateRef", () => {
		this.OR([
			{ ALT: () => this.CONSUME(Reads) },
			{ ALT: () => this.CONSUME(Writes) },
		]);
		this.CONSUME(IdentifierName);
	});

	preClause = this.RULE("preClause", () => {
		this.CONSUME(Pre);
		this.CONSUME(IdentifierName);
		this.MANY(() => {
			this.CONSUME(Comma);
			this.CONSUME2(IdentifierName);
		});
	});

	postClause = this.RULE("postClause", () => {
		this.CONSUME(Post);
		this.CONSUME(IdentifierName);
		this.MANY(() => {
			this.CONSUME(Comma);
			this.CONSUME2(IdentifierName);
		});
	});

	inputClause = this.RULE("inputClause", () => {
		this.CONSUME(Input);
		this.CONSUME(LBrace);
		this.MANY(() => {
			this.SUBRULE(this.paramDecl);
		});
		this.CONSUME(RBrace);
	});

	paramDecl = this.RULE("paramDecl", () => {
		this.SUBRULE(this.tagList);
		this.CONSUME(IdentifierName);
		this.OPTION(() => {
			this.CONSUME(Question);
		});
		this.CONSUME(Colon);
		this.SUBRULE(this.typeExpr);
		this.OPTION2(() => {
			this.CONSUME(StringLiteral);
		});
	});

	outputClause = this.RULE("outputClause", () => {
		this.CONSUME(Output);
		this.SUBRULE(this.typeExpr);
	});

	emitsClause = this.RULE("emitsClause", () => {
		this.CONSUME(Emits);
		this.CONSUME(IdentifierName);
		this.OPTION(() => {
			this.CONSUME(StringLiteral);
		});
		this.MANY(() => {
			this.CONSUME(Comma);
			this.CONSUME2(IdentifierName);
			this.OPTION2(() => {
				this.CONSUME2(StringLiteral);
			});
		});
	});

	errorsClause = this.RULE("errorsClause", () => {
		this.CONSUME(Errors);
		this.CONSUME(LBrace);
		this.MANY(() => {
			this.SUBRULE(this.errorEntry);
		});
		this.CONSUME(RBrace);
	});

	errorEntry = this.RULE("errorEntry", () => {
		this.CONSUME(IdentifierName);
		this.OPTION(() => {
			this.CONSUME(StringLiteral);
		});
		this.OPTION2(() => {
			this.CONSUME(When);
			this.CONSUME2(StringLiteral);
		});
	});

	// =========================================================================
	// Query
	// =========================================================================

	queryDecl = this.RULE("queryDecl", () => {
		this.CONSUME(Query);
		this.CONSUME(IdentifierName);
		this.OPTION(() => {
			this.CONSUME(StringLiteral);
		});
		this.MANY(() => {
			this.SUBRULE(this.operationClause);
		});
	});

	// =========================================================================
	// Function
	// =========================================================================

	functionDecl = this.RULE("functionDecl", () => {
		this.CONSUME(FunctionKw);
		this.CONSUME(IdentifierName);
		this.OPTION(() => {
			this.SUBRULE(this.typeParameterList);
		});
		this.OPTION2(() => {
			this.CONSUME(StringLiteral);
		});
		this.MANY(() => {
			this.SUBRULE(this.functionClause);
		});
	});

	functionClause = this.RULE("functionClause", () => {
		this.OR([
			{ ALT: () => this.SUBRULE(this.inputClause) },
			{ ALT: () => this.SUBRULE(this.outputClause) },
			{ ALT: () => this.SUBRULE(this.errorsClause) },
		]);
	});

	// =========================================================================
	// Invariant
	// =========================================================================

	invariantDecl = this.RULE("invariantDecl", () => {
		this.CONSUME(Invariant);
		this.CONSUME(IdentifierName);
		this.OPTION(() => {
			this.CONSUME(On);
			this.CONSUME2(IdentifierName);
		});
		this.OPTION2(() => {
			this.CONSUME(StringLiteral);
		});
		this.OPTION3(() => {
			this.CONSUME(Violation);
			this.CONSUME2(StringLiteral);
		});
		this.CONSUME(Where);
		this.SUBRULE(this.conditionExpr);
	});

	// =========================================================================
	// Contract
	// =========================================================================

	contractDecl = this.RULE("contractDecl", () => {
		this.CONSUME(Contract);
		this.CONSUME(IdentifierName);
		this.CONSUME(On);
		this.CONSUME2(IdentifierName);
		this.OPTION(() => {
			this.CONSUME(StringLiteral);
		});
		this.OPTION2(() => {
			this.CONSUME(Given);
			this.SUBRULE(this.contractBindingList);
		});
		this.OPTION3(() => {
			this.CONSUME(When);
			this.SUBRULE(this.contractStepList);
		});
		this.CONSUME(Then);
		this.SUBRULE(this.conditionExpr);
	});

	contractBindingList = this.RULE("contractBindingList", () => {
		this.SUBRULE(this.contractBinding);
		this.MANY(() => {
			this.CONSUME(Comma);
			this.SUBRULE2(this.contractBinding);
		});
	});

	contractBinding = this.RULE("contractBinding", () => {
		this.CONSUME(IdentifierName);
		this.CONSUME(Colon);
		this.CONSUME2(IdentifierName);
	});

	contractStepList = this.RULE("contractStepList", () => {
		this.SUBRULE(this.callExpr);
		this.MANY(() => {
			this.CONSUME(Comma);
			this.SUBRULE2(this.callExpr);
		});
	});

	callExpr = this.RULE("callExpr", () => {
		this.CONSUME(IdentifierName);
		this.CONSUME(LParen);
		this.OPTION(() => {
			this.SUBRULE(this.callArgList);
		});
		this.CONSUME(RParen);
	});

	callArgList = this.RULE("callArgList", () => {
		this.SUBRULE(this.valueExpr);
		this.MANY(() => {
			this.CONSUME(Comma);
			this.SUBRULE2(this.valueExpr);
		});
	});

	// =========================================================================
	// Subscriber
	// =========================================================================

	subscriberDecl = this.RULE("subscriberDecl", () => {
		this.CONSUME(Subscriber);
		this.CONSUME(IdentifierName);
		this.OPTION(() => {
			this.CONSUME(StringLiteral);
		});
		this.CONSUME(On);
		this.CONSUME2(IdentifierName);
		this.MANY(() => {
			this.CONSUME(Comma);
			this.CONSUME3(IdentifierName);
		});
	});

	// =========================================================================
	// Port
	// =========================================================================

	portDecl = this.RULE("portDecl", () => {
		this.CONSUME(Port);
		this.CONSUME(IdentifierName);
		this.OPTION(() => {
			this.SUBRULE(this.typeParameterList);
		});
		this.OPTION2(() => {
			this.CONSUME(StringLiteral);
		});
		this.CONSUME(LBrace);
		this.MANY(() => {
			this.SUBRULE(this.portMethodDecl);
		});
		this.CONSUME(RBrace);
	});

	portMethodDecl = this.RULE("portMethodDecl", () => {
		this.CONSUME(IdentifierName);
		this.CONSUME(LParen);
		this.OPTION(() => {
			this.SUBRULE(this.portParamList);
		});
		this.CONSUME(RParen);
		this.CONSUME(Colon);
		this.SUBRULE(this.typeExpr);
		this.OPTION2(() => {
			this.CONSUME(Throws);
			this.CONSUME2(IdentifierName);
			this.MANY(() => {
				this.CONSUME(Comma);
				this.CONSUME3(IdentifierName);
			});
		});
		this.OPTION3(() => {
			this.CONSUME(StringLiteral);
		});
	});

	portParamList = this.RULE("portParamList", () => {
		this.SUBRULE(this.portParam);
		this.MANY(() => {
			this.CONSUME(Comma);
			this.SUBRULE2(this.portParam);
		});
	});

	portParam = this.RULE("portParam", () => {
		this.CONSUME(IdentifierName);
		this.CONSUME(Colon);
		this.SUBRULE(this.typeExpr);
	});

	// =========================================================================
	// Context Error
	// =========================================================================

	contextErrorDecl = this.RULE("contextErrorDecl", () => {
		this.CONSUME(ErrorKw);
		this.CONSUME(IdentifierName);
		this.OPTION(() => {
			this.CONSUME(StringLiteral);
		});
		this.CONSUME(LBrace);
		this.MANY(() => {
			this.SUBRULE(this.attributeDecl);
		});
		this.CONSUME(RBrace);
	});

	// =========================================================================
	// Types
	// =========================================================================

	typeDecl = this.RULE("typeDecl", () => {
		this.CONSUME(TypeKw);
		this.CONSUME(IdentifierName);
		this.OPTION(() => {
			this.SUBRULE(this.typeParameterList);
		});
		this.OPTION2(() => {
			this.CONSUME(StringLiteral);
		});
		this.CONSUME(LBrace);
		this.MANY(() => {
			this.SUBRULE(this.fieldDecl);
		});
		this.CONSUME(RBrace);
	});

	unionDecl = this.RULE("unionDecl", () => {
		this.CONSUME(Union);
		this.CONSUME(IdentifierName);
		this.OPTION(() => {
			this.SUBRULE(this.typeParameterList);
		});
		this.CONSUME(By);
		this.CONSUME2(IdentifierName);
		this.OPTION2(() => {
			this.CONSUME(StringLiteral);
		});
		this.CONSUME(LBrace);
		this.MANY(() => {
			this.SUBRULE(this.variantDecl);
		});
		this.CONSUME(RBrace);
	});

	variantDecl = this.RULE("variantDecl", () => {
		this.SUBRULE(this.variantName);
		this.OPTION(() => {
			this.CONSUME(StringLiteral);
		});
		this.OPTION2(() => {
			this.CONSUME(LBrace);
			this.MANY(() => {
				this.SUBRULE(this.fieldDecl);
			});
			this.CONSUME(RBrace);
		});
	});

	variantName = this.RULE("variantName", () => {
		this.OR([
			{ ALT: () => this.CONSUME(IdentifierName) },
			{ ALT: () => this.CONSUME(Count) },
		]);
	});

	fieldDecl = this.RULE("fieldDecl", () => {
		this.SUBRULE(this.fieldName);
		this.OPTION(() => {
			this.CONSUME(Question);
		});
		this.CONSUME(Colon);
		this.SUBRULE(this.typeExpr);
		this.OPTION2(() => {
			this.CONSUME(StringLiteral);
		});
	});

	fieldName = this.RULE("fieldName", () => {
		this.OR([
			{ ALT: () => this.CONSUME(IdentifierName) },
			{ ALT: () => this.CONSUME(Count) },
		]);
	});

	aliasDecl = this.RULE("aliasDecl", () => {
		this.CONSUME(Alias);
		this.CONSUME(IdentifierName);
		this.OPTION(() => {
			this.SUBRULE(this.typeParameterList);
		});
		this.CONSUME(Equals);
		this.SUBRULE(this.typeExpr);
		this.OPTION2(() => {
			this.CONSUME(StringLiteral);
		});
	});

	// =========================================================================
	// Type Parameters
	// =========================================================================

	typeParameterList = this.RULE("typeParameterList", () => {
		this.CONSUME(LessThan);
		this.SUBRULE(this.typeParameter);
		this.MANY(() => {
			this.CONSUME(Comma);
			this.SUBRULE2(this.typeParameter);
		});
		this.CONSUME(GreaterThan);
	});

	typeParameter = this.RULE("typeParameter", () => {
		this.CONSUME(IdentifierName);
		this.OPTION(() => {
			this.CONSUME(Colon);
			this.SUBRULE(this.typeExpr);
		});
		this.OPTION2(() => {
			this.CONSUME(Equals);
			this.SUBRULE2(this.typeExpr);
		});
	});

	// =========================================================================
	// Dependencies
	// =========================================================================

	dependsDecl = this.RULE("dependsDecl", () => {
		this.CONSUME(Depends);
		this.CONSUME(On);
		this.CONSUME(IdentifierName);
		this.MANY(() => {
			this.CONSUME(Comma);
			this.CONSUME2(IdentifierName);
		});
	});

	// =========================================================================
	// Type Expressions
	// =========================================================================

	typeExpr = this.RULE("typeExpr", () => {
		this.SUBRULE(this.primaryTypeExpr);
		this.OPTION(() => {
			this.CONSUME(LBracket);
			this.CONSUME(RBracket);
		});
		this.OPTION2(() => {
			this.CONSUME(Question);
		});
	});

	primaryTypeExpr = this.RULE("primaryTypeExpr", () => {
		this.OR([
			{
				ALT: () => {
					this.CONSUME(LParen);
					this.OPTION(() => {
						this.SUBRULE(this.functionParamList);
					});
					this.CONSUME(RParen);
					this.CONSUME(FatArrow);
					this.SUBRULE(this.typeExpr);
				},
			},
			{
				ALT: () => {
					this.SUBRULE(this.stringUnionType);
				},
			},
			{
				ALT: () => {
					this.CONSUME(IdentifierName);
					this.OR2([
						{
							ALT: () => {
								this.CONSUME(Dot);
								this.CONSUME2(IdentifierName);
							},
						},
						{
							ALT: () => {
								this.CONSUME(LessThan);
								this.SUBRULE(this.typeArgList);
								this.CONSUME(GreaterThan);
							},
						},
						// eslint-disable-next-line @typescript-eslint/no-empty-function -- Chevrotain epsilon (empty) alternative
						{ ALT: () => {} },
					]);
				},
			},
		]);
	});

	stringUnionType = this.RULE("stringUnionType", () => {
		this.CONSUME(StringLiteral);
		this.MANY(() => {
			this.CONSUME(Pipe);
			this.CONSUME2(StringLiteral);
		});
	});

	functionParamList = this.RULE("functionParamList", () => {
		this.SUBRULE(this.portParam);
		this.MANY(() => {
			this.CONSUME(Comma);
			this.SUBRULE2(this.portParam);
		});
	});

	typeArgList = this.RULE("typeArgList", () => {
		this.SUBRULE(this.typeExpr);
		this.MANY(() => {
			this.CONSUME(Comma);
			this.SUBRULE2(this.typeExpr);
		});
	});

	// =========================================================================
	// Condition Expressions
	// =========================================================================

	conditionExpr = this.RULE("conditionExpr", () => {
		this.SUBRULE(this.orExpr);
	});

	orExpr = this.RULE("orExpr", () => {
		this.SUBRULE(this.andExpr);
		this.MANY(() => {
			this.CONSUME(Or);
			this.SUBRULE2(this.andExpr);
		});
	});

	andExpr = this.RULE("andExpr", () => {
		this.SUBRULE(this.notExpr);
		this.MANY(() => {
			this.CONSUME(And);
			this.SUBRULE2(this.notExpr);
		});
	});

	notExpr = this.RULE("notExpr", () => {
		this.OR([
			{
				ALT: () => {
					this.CONSUME(Not);
					this.SUBRULE(this.notExpr);
				},
			},
			{
				ALT: () => {
					this.SUBRULE(this.primaryCondition);
				},
			},
		]);
	});

	primaryCondition = this.RULE("primaryCondition", () => {
		this.OR([
			{
				ALT: () => {
					this.CONSUME(If);
					this.SUBRULE(this.conditionExpr);
					this.CONSUME(Then);
					this.SUBRULE2(this.conditionExpr);
				},
			},
			{
				ALT: () => {
					this.CONSUME(Exists);
					this.CONSUME(IdentifierName);
					this.CONSUME(In);
					this.SUBRULE(this.valueExpr);
					this.CONSUME(Colon);
					this.SUBRULE3(this.conditionExpr);
				},
			},
			{
				ALT: () => {
					this.CONSUME(Forall);
					this.CONSUME2(IdentifierName);
					this.CONSUME2(In);
					this.SUBRULE2(this.valueExpr);
					this.CONSUME2(Colon);
					this.SUBRULE4(this.conditionExpr);
				},
			},
			{
				ALT: () => {
					this.CONSUME(LParen);
					this.SUBRULE5(this.conditionExpr);
					this.CONSUME(RParen);
				},
			},
			{
				ALT: () => {
					this.SUBRULE(this.comparison);
				},
			},
		]);
	});

	comparison = this.RULE("comparison", () => {
		this.SUBRULE(this.valueExpr);
		this.OR([
			{
				ALT: () => {
					this.CONSUME(Contains);
					this.SUBRULE2(this.valueExpr);
				},
			},
			{
				ALT: () => {
					this.SUBRULE(this.comparisonOp);
					this.SUBRULE3(this.valueExpr);
				},
			},
		]);
	});

	comparisonOp = this.RULE("comparisonOp", () => {
		this.OR([
			{ ALT: () => this.CONSUME(DoubleEquals) },
			{ ALT: () => this.CONSUME(NotEquals) },
			{ ALT: () => this.CONSUME(GreaterThanOrEqual) },
			{ ALT: () => this.CONSUME(LessThanOrEqual) },
			{ ALT: () => this.CONSUME(GreaterThan) },
			{ ALT: () => this.CONSUME(LessThan) },
		]);
	});

	// =========================================================================
	// Value Expressions
	// =========================================================================

	valueExpr = this.RULE("valueExpr", () => {
		this.OR([
			{
				ALT: () => {
					this.CONSUME(Count);
					this.CONSUME(LParen);
					this.SUBRULE(this.valueExpr);
					this.CONSUME(RParen);
				},
			},
			{
				ALT: () => {
					this.CONSUME(NumberLiteral);
				},
			},
			{
				ALT: () => {
					this.CONSUME(StringLiteral);
				},
			},
			{
				ALT: () => {
					this.CONSUME(True);
				},
			},
			{
				ALT: () => {
					this.CONSUME(False);
				},
			},
			{
				ALT: () => {
					this.CONSUME(Null);
				},
			},
			{
				ALT: () => {
					this.SUBRULE(this.identOrKeyword);
					this.OPTION2(() => {
						this.CONSUME2(LParen);
						this.OPTION3(() => {
							this.SUBRULE(this.callArgList);
						});
						this.CONSUME2(RParen);
					});
					this.MANY(() => {
						this.CONSUME(Dot);
						this.SUBRULE2(this.identOrKeyword);
					});
				},
			},
		]);
	});

	identOrKeyword = this.RULE("identOrKeyword", () => {
		this.CONSUME(IdentifierName);
	});
}

export const morphParser = new MorphParser();
