import { createToken, Lexer } from "chevrotain";

// =============================================================================
// Whitespace & Comments
// =============================================================================

export const WhiteSpace = createToken({
	name: "WhiteSpace",
	pattern: /\s+/,
	group: Lexer.SKIPPED,
});

export const LineComment = createToken({
	name: "LineComment",
	pattern: /\/\/[^\n\r]*/,
	group: Lexer.SKIPPED,
});

// =============================================================================
// Literals
// =============================================================================

export const StringLiteral = createToken({
	name: "StringLiteral",
	pattern: /"(?:[^"\\]|\\.)*"/,
});

export const NumberLiteral = createToken({
	name: "NumberLiteral",
	pattern: /\d+(?:\.\d+)?/,
});

// =============================================================================
// Identifier (defined early so keywords can reference it)
// =============================================================================

// Category token for "any word that can appear as an identifier".
// Keywords like `storage`, `auth`, `value` etc. belong to this category,
// allowing them to be used as identifiers in contextual positions
// (e.g. port param names, dependency names).
export const IdentifierName = createToken({
	name: "IdentifierName",
	pattern: Lexer.NA,
});

export const Identifier = createToken({
	name: "Identifier",
	pattern: /[a-z_][\w-]*/i,
	categories: [IdentifierName],
});

// =============================================================================
// Keywords (all use longer_alt: Identifier to avoid matching identifiers)
// Prefix keywords set longer_alt to their longer variants.
// =============================================================================

export const Domain = createToken({
	name: "Domain",
	pattern: /domain/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Context = createToken({
	name: "Context",
	pattern: /context/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Entity = createToken({
	name: "Entity",
	pattern: /entity/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Value = createToken({
	name: "Value",
	pattern: /value/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const TypeKw = createToken({
	name: "TypeKw",
	pattern: /type/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Union = createToken({
	name: "Union",
	pattern: /union/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Alias = createToken({
	name: "Alias",
	pattern: /alias/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Command = createToken({
	name: "Command",
	pattern: /command/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Query = createToken({
	name: "Query",
	pattern: /query/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const FunctionKw = createToken({
	name: "FunctionKw",
	pattern: /function/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Invariant = createToken({
	name: "Invariant",
	pattern: /invariant/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Subscriber = createToken({
	name: "Subscriber",
	pattern: /subscriber/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Port = createToken({
	name: "Port",
	pattern: /port/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Extensions = createToken({
	name: "Extensions",
	pattern: /extensions/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Profiles = createToken({
	name: "Profiles",
	pattern: /profiles/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Input = createToken({
	name: "Input",
	pattern: /input/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Output = createToken({
	name: "Output",
	pattern: /output/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Emits = createToken({
	name: "Emits",
	pattern: /emits/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
// Errors must appear before ErrorKw (prefix conflict)
export const Errors = createToken({
	name: "Errors",
	pattern: /errors/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const ErrorKw = createToken({
	name: "ErrorKw",
	pattern: /error/,
	longer_alt: Errors,
	categories: [IdentifierName],
});
export const Pre = createToken({
	name: "Pre",
	pattern: /pre/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Post = createToken({
	name: "Post",
	pattern: /post/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const On = createToken({
	name: "On",
	pattern: /on/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const When = createToken({
	name: "When",
	pattern: /when/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Where = createToken({
	name: "Where",
	pattern: /where/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Violation = createToken({
	name: "Violation",
	pattern: /violation/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Reads = createToken({
	name: "Reads",
	pattern: /reads/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Writes = createToken({
	name: "Writes",
	pattern: /writes/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const BelongsTo = createToken({
	name: "BelongsTo",
	pattern: /belongs_to/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const HasMany = createToken({
	name: "HasMany",
	pattern: /has_many/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const HasOne = createToken({
	name: "HasOne",
	pattern: /has_one/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const References = createToken({
	name: "References",
	pattern: /references/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Exists = createToken({
	name: "Exists",
	pattern: /exists/,
	longer_alt: Identifier,
});
export const Given = createToken({
	name: "Given",
	pattern: /given/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Forall = createToken({
	name: "Forall",
	pattern: /forall/,
	longer_alt: Identifier,
});
export const If = createToken({
	name: "If",
	pattern: /if/,
	longer_alt: Identifier,
});
export const Then = createToken({
	name: "Then",
	pattern: /then/,
	longer_alt: Identifier,
});
export const Default = createToken({
	name: "Default",
	pattern: /default/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Base = createToken({
	name: "Base",
	pattern: /base/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const By = createToken({
	name: "By",
	pattern: /by/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Depends = createToken({
	name: "Depends",
	pattern: /depends/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Storage = createToken({
	name: "Storage",
	pattern: /storage/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Auth = createToken({
	name: "Auth",
	pattern: /auth/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const EventStore = createToken({
	name: "EventStore",
	pattern: /eventStore/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Sse = createToken({
	name: "Sse",
	pattern: /sse/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const I18n = createToken({
	name: "I18n",
	pattern: /i18n/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Contract = createToken({
	name: "Contract",
	pattern: /contract/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const Contains = createToken({
	name: "Contains",
	pattern: /contains/,
	longer_alt: Identifier,
});
export const Count = createToken({
	name: "Count",
	pattern: /count/,
	longer_alt: Identifier,
});
export const Throws = createToken({
	name: "Throws",
	pattern: /throws/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
// In must appear after Input/Invariant (they have Identifier as longer_alt,
// and "in" is not a prefix issue since "input" starts differently at char 3)
export const In = createToken({
	name: "In",
	pattern: /in/,
	longer_alt: Identifier,
	categories: [IdentifierName],
});
export const True = createToken({
	name: "True",
	pattern: /true/,
	longer_alt: Identifier,
});
export const False = createToken({
	name: "False",
	pattern: /false/,
	longer_alt: Identifier,
});
export const Null = createToken({
	name: "Null",
	pattern: /null/,
	longer_alt: Identifier,
});

// =============================================================================
// Operators & Punctuation
// =============================================================================

export const DoubleEquals = createToken({
	name: "DoubleEquals",
	pattern: /==/,
});
export const NotEquals = createToken({ name: "NotEquals", pattern: /!=/ });
export const FatArrow = createToken({ name: "FatArrow", pattern: /=>/ });
export const GreaterThanOrEqual = createToken({
	name: "GreaterThanOrEqual",
	pattern: />=/,
});
export const LessThanOrEqual = createToken({
	name: "LessThanOrEqual",
	pattern: /<=/,
});
export const GreaterThan = createToken({
	name: "GreaterThan",
	pattern: />/,
});
export const LessThan = createToken({ name: "LessThan", pattern: /</ });
export const And = createToken({ name: "And", pattern: /&&/ });
export const Or = createToken({ name: "Or", pattern: /\|\|/ });
export const Not = createToken({ name: "Not", pattern: /!/ });
export const DotDot = createToken({ name: "DotDot", pattern: /\.\./ });
export const Dot = createToken({ name: "Dot", pattern: /\./ });
export const Pipe = createToken({ name: "Pipe", pattern: /\|/ });
export const At = createToken({ name: "At", pattern: /@/ });
export const Hash = createToken({ name: "Hash", pattern: /#/ });
export const Question = createToken({ name: "Question", pattern: /\?/ });
export const Equals = createToken({ name: "Equals", pattern: /=/ });
export const Colon = createToken({ name: "Colon", pattern: /:/ });
export const Comma = createToken({ name: "Comma", pattern: /,/ });
export const LBrace = createToken({ name: "LBrace", pattern: /\{/ });
export const RBrace = createToken({ name: "RBrace", pattern: /\}/ });
export const LBracket = createToken({ name: "LBracket", pattern: /\[/ });
export const RBracket = createToken({ name: "RBracket", pattern: /\]/ });
export const LParen = createToken({ name: "LParen", pattern: /\(/ });
export const RParen = createToken({ name: "RParen", pattern: /\)/ });

// =============================================================================
// Token Order
//
// Chevrotain rules: longer patterns of the same kind must appear first.
// Keywords with longer_alt: Identifier go before Identifier.
// Multi-char operators go before their single-char prefixes.
// Prefix keywords (error→errors) handled via longer_alt chains.
// =============================================================================

export const allTokens = [
	WhiteSpace,
	LineComment,
	StringLiteral,
	NumberLiteral,
	// Category token — never matched by lexer, used by parser for keyword-as-identifier
	IdentifierName,
	// Multi-char operators before single-char
	DoubleEquals,
	NotEquals,
	FatArrow,
	GreaterThanOrEqual,
	LessThanOrEqual,
	And,
	Or,
	DotDot,
	// Keywords (longer variants before shorter prefixes)
	Extensions,
	Profiles,
	EventStore,
	BelongsTo,
	HasMany,
	HasOne,
	References,
	Subscriber,
	Invariant,
	FunctionKw,
	Violation,
	Contains,
	Contract,
	Command,
	Context,
	Default,
	Depends,
	Domain,
	Entity,
	Errors,
	ErrorKw,
	Exists,
	Forall,
	Output,
	Storage,
	Throws,
	Value,
	Where,
	Alias,
	Count,
	Emits,
	False,
	Given,
	Input,
	Query,
	Reads,
	Union,
	When,
	Writes,
	Auth,
	Base,
	Port,
	Post,
	True,
	Null,
	TypeKw,
	I18n,
	Sse,
	By,
	If,
	In,
	On,
	Pre,
	Then,
	Identifier,
	// Single-char operators
	GreaterThan,
	LessThan,
	Not,
	Dot,
	Pipe,
	At,
	Hash,
	Question,
	Equals,
	Colon,
	Comma,
	LBrace,
	RBrace,
	LBracket,
	RBracket,
	LParen,
	RParen,
];

export const morphLexer = new Lexer(allTokens);
