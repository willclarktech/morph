export const promptInput = async (promptText: string): Promise<string> => {
	const readline = await import("node:readline");
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	return new Promise((resolve) => {
		rl.question(promptText, (answer) => {
			rl.close();
			resolve(answer);
		});
	});
};

export const promptSecure = async (promptText: string): Promise<string> => {
	process.stdout.write(promptText);

	const readline = await import("node:readline");
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: true,
	});

	const stdin = process.stdin;

	// For non-TTY (piped input), just read a line normally
	if (!stdin.isTTY) {
		return new Promise((resolve) => {
			rl.question("", (answer) => {
				rl.close();
				resolve(answer);
			});
		});
	}

	// For TTY, disable echo for secure password entry
	const wasRaw = stdin.isRaw;
	stdin.setRawMode(true);

	return new Promise((resolve, reject) => {
		let input = "";
		const cleanup = () => {
			stdin.removeListener("data", onData);
			stdin.setRawMode(wasRaw);
			rl.close();
		};

		const onData = (chunk: Buffer) => {
			const byte = chunk[0];
			if (byte === undefined) return;
			switch (byte) {
				case 3: {
					// Ctrl+C
					cleanup();
					reject(new Error("Interrupted"));
					break;
				}
				case 8:
				case 127: {
					// Backspace
					input = input.slice(0, -1);
					break;
				}
				case 10:
				case 13: {
					// Enter
					cleanup();
					process.stdout.write("\n");
					resolve(input);
					break;
				}
				default: {
					if (byte >= 32) {
						input += chunk.toString();
					}
				}
			}
		};

		stdin.on("data", onData);
		stdin.resume();
	});
};
