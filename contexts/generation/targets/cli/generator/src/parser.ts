export interface ParsedArguments {
	readonly command: string | undefined;
	readonly options: Readonly<Record<string, string>>;
	readonly positional: readonly string[];
}

interface ParseState {
	readonly options: Readonly<Record<string, string>>;
	readonly pendingKey: string | undefined;
	readonly positional: readonly string[];
}

const INITIAL_PARSE_STATE: ParseState = {
	options: {},
	pendingKey: undefined,
	positional: [],
};

const isFlag = (token: string): boolean =>
	token.startsWith("-") && token.length > 1;

const extractKey = (token: string): string =>
	token.startsWith("--") ? token.slice(2) : token.slice(1);

const appendOption = (
	options: Readonly<Record<string, string>>,
	key: string,
	value: string,
): Readonly<Record<string, string>> => {
	const existing = options[key];
	return {
		...options,
		[key]: existing === undefined ? value : `${existing},${value}`,
	};
};

const processToken = (
	state: Readonly<ParseState>,
	token: string,
	nextToken: string | undefined,
): ParseState => {
	if (state.pendingKey !== undefined) {
		return {
			...state,
			options: appendOption(state.options, state.pendingKey, token),
			pendingKey: undefined,
		};
	}
	if (isFlag(token)) {
		const key = extractKey(token);
		const nextIsFlag = nextToken === undefined || isFlag(nextToken);
		if (nextIsFlag) {
			return {
				...state,
				options: appendOption(state.options, key, "true"),
			};
		}
		return { ...state, pendingKey: key };
	}
	return {
		...state,
		positional: [...state.positional, token],
	};
};

const parseTokens = (
	tokens: readonly string[],
	state: Readonly<ParseState> = INITIAL_PARSE_STATE,
): ParseState => {
	const [first, second, ...remaining] = tokens;
	if (first === undefined) {
		return state;
	}
	const newState = processToken(state, first, second);
	const rest = second === undefined ? [] : [second, ...remaining];
	return parseTokens(rest, newState);
};

export const parseArguments = (argv: readonly string[]): ParsedArguments => {
	const [command, ...rest] = argv;
	const { options, positional } = parseTokens(rest);
	return { command, options, positional };
};

export const isHelpRequest = (parsed: ParsedArguments): boolean =>
	parsed.options["help"] === "true" ||
	parsed.options["h"] === "true" ||
	parsed.positional.includes("--help") ||
	parsed.positional.includes("-h");
