/**
 * Convert camelCase or PascalCase to kebab-case.
 *
 * @example
 * toKebabCase("addPackage") // "add-package"
 * toKebabCase("generateCliApp") // "generate-cli-app"
 * toKebabCase("outputDir") // "output-dir"
 */
export const toKebabCase = (name: string): string =>
	name
		.replaceAll(/([a-z])([A-Z])/g, "$1-$2")
		.replaceAll(/[_\s]+/g, "-")
		.toLowerCase();

/**
 * Convert kebab-case or snake_case to camelCase.
 *
 * @example
 * toCamelCase("add-package") // "addPackage"
 * toCamelCase("output_dir") // "outputDir"
 */
export const toCamelCase = (name: string): string => {
	const parts = name.split(/[-_]/);
	return parts
		.map((part, index) =>
			index === 0
				? part.charAt(0).toLowerCase() + part.slice(1)
				: part.charAt(0).toUpperCase() + part.slice(1),
		)
		.join("");
};

/**
 * Convert kebab-case, snake_case, or camelCase to PascalCase.
 *
 * @example
 * toPascalCase("todo") // "Todo"
 * toPascalCase("todo-item") // "TodoItem"
 * toPascalCase("todoItem") // "TodoItem"
 */
export const toPascalCase = (name: string): string => {
	const parts = name.split(/[-_]/);
	return parts
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");
};

/**
 * Convert camelCase or PascalCase to Title Case (with spaces).
 *
 * @example
 * toTitleCase("addPackage") // "Add Package"
 * toTitleCase("generateCliApp") // "Generate Cli App"
 */
export const toTitleCase = (string_: string): string =>
	string_
		.replaceAll(/([A-Z])/g, " $1")
		.replace(/^./, (c) => c.toUpperCase())
		.trim();

/**
 * Convert camelCase or PascalCase to snake_case.
 *
 * @example
 * toSnakeCase("userId") // "user_id"
 * toSnakeCase("passwordHash") // "password_hash"
 * toSnakeCase("dueDate") // "due_date"
 */
export const toSnakeCase = (name: string): string =>
	name
		.replaceAll(/([a-z])([A-Z])/g, "$1_$2")
		.replaceAll(/[-\s]+/g, "_")
		.toLowerCase();

/**
 * Convert a name to SCREAMING_SNAKE_CASE for environment variable prefixes.
 *
 * @example
 * toEnvironmentPrefix("my-app") // "MY_APP"
 * toEnvironmentPrefix("todoApi") // "TODOAPI"
 */
export const toEnvironmentPrefix = (name: string): string =>
	name.toUpperCase().replaceAll("-", "_");
