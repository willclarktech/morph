/**
 * Generate installation section.
 */
import { codeBlock, heading } from "../markdown";

/**
 * Generate installation instructions for a package.
 */
export const installation = (packageName: string): string => {
	const lines = [
		heading(2, "Installation"),
		codeBlock(`bun add ${packageName}`, "bash"),
	];

	return lines.join("\n\n");
};
