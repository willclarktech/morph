import * as readline from "node:readline";

export interface ReplConfig {
	readonly execute: (argv: readonly string[]) => Promise<number>;
	readonly name: string;
}

const tokenizeLine = (line: string): string[] => {
	const tokens: string[] = [];
	let current = "";
	let inQuote = false;
	let quoteChar = "";

	for (const ch of line) {
		if (inQuote) {
			if (ch === quoteChar) {
				inQuote = false;
			} else {
				current += ch;
			}
		} else if (ch === '"' || ch === "'") {
			inQuote = true;
			quoteChar = ch;
		} else if (ch === " " || ch === "\t") {
			if (current) {
				tokens.push(current);
				current = "";
			}
		} else {
			current += ch;
		}
	}

	if (current) tokens.push(current);
	return tokens;
};

export const createRepl = async (config: ReplConfig): Promise<void> => {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: process.stdin.isTTY ?? false,
	});

	console.info(
		`${config.name} console. Type "help" for commands, "exit" to quit.`,
	);

	rl.on("SIGINT", () => {
		process.stdout.write("\n> ");
	});

	rl.setPrompt("> ");
	rl.prompt();

	for await (const line of rl) {
		const trimmed = line.trim();
		if (!trimmed) {
			rl.prompt();
			continue;
		}
		if (trimmed === "exit" || trimmed === "quit") {
			break;
		}
		if (trimmed === "clear") {
			console.clear();
			rl.prompt();
			continue;
		}

		const argv = tokenizeLine(trimmed);
		const normalizedArgv =
			argv[0] === "help"
				? argv.length > 1
					? [...argv.slice(1), "--help"]
					: ["--help"]
				: argv;

		try {
			await config.execute(normalizedArgv);
		} catch {
			// errors handled by execute callback
		}
		rl.prompt();
	}

	rl.close();
};
