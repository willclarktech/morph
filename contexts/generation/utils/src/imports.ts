/**
 * Sort import blocks to match perfectionist/sort-imports (recommended-natural).
 *
 * Groups (separated by blank lines):
 * 1. External type imports (`import type ... from "pkg"`)
 * 2. External value imports (`import ... from "pkg"`)
 * 3. Relative type imports (`import type ... from "./..."`)
 * 4. Relative value imports (`import ... from "./..."`)
 */
export const sortImports = (importBlock: string): string => {
	const lines = importBlock.split("\n");

	// Parse multi-line imports into single logical import statements
	const statements: string[] = [];
	let current = "";
	for (const line of lines) {
		if (current) {
			current += "\n" + line;
			if (
				(line.includes("from ") || line.trimStart().startsWith("}")) && // Check if the statement is complete (has closing quote)
				/from\s+["']/.test(current) &&
				/["'];?\s*$/.test(line)
			) {
				statements.push(current);
				current = "";
			}
		} else if (line.startsWith("import ")) {
			// Single-line import
			if (/from\s+["'].*["'];?\s*$/.test(line)) {
				statements.push(line);
			} else {
				current = line;
			}
		}
		// Skip non-import lines (comments, blanks between imports)
	}
	if (current) statements.push(current);

	// Sort named imports within each statement to match perfectionist/sort-named-imports
	const sortedStatements = statements.map(sortNamedImports);

	const specifier = (stmt: string): string => {
		const match = /from\s+["']([^"']+)["']/.exec(stmt);
		return match?.[1] ?? "";
	};

	const isType = (stmt: string): boolean =>
		stmt.startsWith("import type ") ||
		stmt.startsWith("import { type ") ||
		(!/^import\s*\{[^}]*\}\s*from/.test(stmt) && stmt.includes("import type"));

	// Merge duplicate imports from the same specifier (e.g. multiple `import { ... } from "x"`)
	const mergedStatements = mergeImportsBySpecifier(
		sortedStatements,
		specifier,
		isType,
	);

	const isRelative = (stmt: string): boolean => {
		const spec = specifier(stmt);
		return (
			spec === "." ||
			spec === ".." ||
			spec.startsWith("./") ||
			spec.startsWith("../")
		);
	};

	const externalTypeImports: string[] = [];
	const externalImports: string[] = [];
	const relativeTypeImports: string[] = [];
	const relativeImports: string[] = [];

	for (const stmt of mergedStatements) {
		const type = isType(stmt);
		const relative = isRelative(stmt);

		if (type && relative) relativeTypeImports.push(stmt);
		else if (type) externalTypeImports.push(stmt);
		else if (relative) relativeImports.push(stmt);
		else externalImports.push(stmt);
	}

	const naturalSort = (a: string, b: string): number =>
		specifier(a).localeCompare(specifier(b), undefined, { numeric: true });

	externalTypeImports.sort(naturalSort);
	externalImports.sort(naturalSort);
	relativeTypeImports.sort(naturalSort);
	relativeImports.sort(naturalSort);

	const groups = [
		externalTypeImports,
		externalImports,
		relativeTypeImports,
		relativeImports,
	].filter((g) => g.length > 0);

	return groups.map((g) => g.join("\n")).join("\n\n");
};

/**
 * Merge duplicate named imports from the same specifier.
 * Only merges named imports (`import { A } from "x"` + `import { B } from "x"` → `import { A, B } from "x"`).
 * Skips namespace imports (`import * as X`) and default imports.
 */
const mergeImportsBySpecifier = (
	statements: readonly string[],
	specifier: (stmt: string) => string,
	isType: (stmt: string) => boolean,
): string[] => {
	// Group by (specifier, isType) key
	const groups = new Map<string, string[]>();
	const result: string[] = [];
	const unmergeable: string[] = [];

	for (const stmt of statements) {
		// Only merge named imports (has { ... })
		if (!/\{[^}]*\}/.test(stmt) || stmt.includes("* as ")) {
			unmergeable.push(stmt);
			continue;
		}

		const spec = specifier(stmt);
		const type = isType(stmt);
		const key = `${type ? "type:" : "value:"}${spec}`;

		const existing = groups.get(key);
		if (existing) {
			existing.push(stmt);
		} else {
			groups.set(key, [stmt]);
		}
	}

	// For each group, merge named imports
	for (const stmts of groups.values()) {
		if (stmts.length === 1) {
			result.push(stmts[0] ?? "");
			continue;
		}

		// Extract all named imports from all statements in the group
		const allNames: string[] = [];
		let prefix = "";
		let suffix = "";

		for (const stmt of stmts) {
			const match = /^(import\s+(?:type\s+)?)\{([^}]+)\}(\s*from\s.+)$/s.exec(
				stmt,
			);
			if (match?.[1] && match[2] && match[3]) {
				prefix = match[1];
				suffix = match[3].trimStart();
				const names = match[2]
					.split(",")
					.map((n) => n.trim())
					.filter((n) => n.length > 0);
				allNames.push(...names);
			}
		}

		// Deduplicate and sort by local name (alias if present)
		const extractLocalName = (n: string): string => {
			const withoutType = n.replace(/^type\s+/, "");
			const asMatch = /\s+as\s+(\S+)$/.exec(withoutType);
			return asMatch?.[1] ?? withoutType;
		};
		const uniqueNames = [...new Set(allNames)].sort((a, b) =>
			extractLocalName(a).localeCompare(extractLocalName(b), undefined, {
				numeric: true,
			}),
		);

		result.push(`${prefix}{ ${uniqueNames.join(", ")} } ${suffix}`);
	}

	return [...unmergeable, ...result];
};

/**
 * Sort named imports within a single import statement alphabetically.
 * Handles both single-line and multi-line imports.
 *
 * `import { C, A, B } from "x"` → `import { A, B, C } from "x"`
 */
const sortNamedImports = (stmt: string): string => {
	// Match the named imports block: { name1, name2, ... }
	const match = /^(import\s+(?:type\s+)?)\{([^}]+)\}(\s*from\s.+)$/s.exec(stmt);
	if (!match?.[1] || !match[2] || !match[3]) return stmt;

	const prefix = match[1];
	const names = match[2];
	const suffix = match[3];
	const isMultiLine = names.includes("\n");

	// Parse individual import names, preserving "type" prefix if present
	const nameList = names
		.split(",")
		.map((n) => n.trim())
		.filter((n) => n.length > 0);

	// Sort by the local name (alias if present, otherwise the import name)
	// For "Foo as Bar", sort by "Bar"; for "Foo", sort by "Foo"
	const extractLocalName = (n: string): string => {
		const withoutType = n.replace(/^type\s+/, "");
		const asMatch = /\s+as\s+(\S+)$/.exec(withoutType);
		return asMatch?.[1] ?? withoutType;
	};
	nameList.sort((a, b) =>
		extractLocalName(a).localeCompare(extractLocalName(b), undefined, {
			numeric: true,
		}),
	);

	if (isMultiLine) {
		const joined = nameList.map((n) => `\t${n},`).join("\n");
		const trimmedSuffix = suffix.trimStart();
		return `${prefix}{\n${joined}\n} ${trimmedSuffix}`;
	}

	return `${prefix}{ ${nameList.join(", ")} }${suffix}`;
};

/**
 * Sort imports within a complete TypeScript file.
 *
 * Only sorts the first contiguous import block at the top of the file.
 * Preserves leading comments/directives before the first import,
 * sorts the import block using {@link sortImports}, and leaves
 * the rest of the file untouched.
 *
 * Files with imports scattered throughout (e.g. generated schemas that
 * have type definitions between two import sections) are handled correctly
 * — only the top-level imports are sorted.
 *
 * Safe to call on files with no imports (returns content unchanged).
 */
export const sortFileImports = (content: string): string => {
	if (!content.includes("import ")) return content;

	const lines = content.split("\n");

	// Find the first import line
	let firstImport = -1;
	for (const [index, line] of lines.entries()) {
		if (line.trim().startsWith("import ")) {
			firstImport = index;
			break;
		}
	}
	if (firstImport === -1) return content;

	// Find the end of the first contiguous import block.
	// The block includes import statements, blank lines, and comments
	// that appear between imports. It ends at the first non-import,
	// non-blank, non-comment line after seeing an import.
	let blockEnd = firstImport;
	let inMultiLine = false;

	for (const [offset, line] of lines.slice(firstImport).entries()) {
		const absoluteIndex = firstImport + offset;
		const trimmed = line.trim();

		if (inMultiLine) {
			blockEnd = absoluteIndex;
			if (/from\s+["'].*["'];?\s*$/.test(trimmed)) inMultiLine = false;
			continue;
		}

		if (trimmed.startsWith("import ")) {
			blockEnd = absoluteIndex;
			if (!/from\s+["'].*["'];?\s*$/.test(trimmed)) inMultiLine = true;
		} else if (
			trimmed === "" ||
			trimmed.startsWith("//") ||
			trimmed.startsWith("/*") ||
			trimmed.startsWith("*")
		) {
			// Blank lines and comments between imports are allowed
			continue;
		} else {
			// Non-import code — end of block
			break;
		}
	}

	const boundary = blockEnd + 1;
	const header = lines.slice(0, boundary).join("\n");
	const body = lines.slice(boundary).join("\n");

	// sortImports extracts and sorts only import statements
	const sorted = sortImports(header);

	// Preserve leading non-import content (comments, directives)
	const leading = lines.slice(0, firstImport).join("\n").trimEnd();

	let result = "";
	if (leading) result += leading + "\n";
	result += sorted;

	const bodyTrimmed = body.replace(/^\n+/, "");
	result += bodyTrimmed ? "\n\n" + bodyTrimmed : "\n";

	return result;
};
