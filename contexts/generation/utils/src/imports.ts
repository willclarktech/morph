/**
 * Sort import blocks to match perfectionist/sort-imports (recommended-natural).
 *
 * Groups (separated by blank lines):
 * 1. Type imports (`import type ...`)
 * 2. External imports (scoped `@...` then bare packages, alphabetically)
 * 3. Relative imports (`./...` or `../...`, alphabetically)
 */
export const sortImports = (importBlock: string): string => {
	const lines = importBlock.split("\n");

	// Parse multi-line imports into single logical import statements
	const statements: string[] = [];
	let current = "";
	for (const line of lines) {
		if (current) {
			current += "\n" + line;
			if (line.includes("from ") || line.trimStart().startsWith("}")) {
				// Check if the statement is complete (has closing quote)
				if (/from\s+["']/.test(current) && /["'];?\s*$/.test(line)) {
					statements.push(current);
					current = "";
				}
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

	const specifier = (stmt: string): string => {
		const match = /from\s+["']([^"']+)["']/.exec(stmt);
		return match?.[1] ?? "";
	};

	const isType = (stmt: string): boolean =>
		stmt.startsWith("import type ") ||
		stmt.startsWith("import { type ") ||
		(/^import\s*\{[^}]*\}\s*from/.test(stmt) === false &&
			stmt.includes("import type"));

	const isRelative = (stmt: string): boolean => {
		const spec = specifier(stmt);
		return spec.startsWith("./") || spec.startsWith("../");
	};

	const typeImports: string[] = [];
	const externalImports: string[] = [];
	const relativeImports: string[] = [];

	for (const stmt of statements) {
		if (isType(stmt)) {
			typeImports.push(stmt);
		} else if (isRelative(stmt)) {
			relativeImports.push(stmt);
		} else {
			externalImports.push(stmt);
		}
	}

	const naturalSort = (a: string, b: string): number =>
		specifier(a).localeCompare(specifier(b), undefined, { numeric: true });

	typeImports.sort(naturalSort);
	externalImports.sort(naturalSort);
	relativeImports.sort(naturalSort);

	const groups = [typeImports, externalImports, relativeImports].filter(
		(g) => g.length > 0,
	);

	return groups.map((g) => g.join("\n")).join("\n\n");
};
