import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";

import {
	toCamelCase,
	toEnvironmentPrefix,
	toKebabCase,
	toPascalCase,
	toTitleCase,
} from "./naming";

describe("toKebabCase", () => {
	test("converts camelCase", () => {
		expect(toKebabCase("addPackage")).toBe("add-package");
	});

	test("converts PascalCase", () => {
		expect(toKebabCase("AddPackage")).toBe("add-package");
	});

	test("handles multiple uppercase transitions", () => {
		expect(toKebabCase("generateCliApp")).toBe("generate-cli-app");
	});

	test("replaces underscores with hyphens", () => {
		expect(toKebabCase("output_dir")).toBe("output-dir");
	});

	test("replaces spaces with hyphens", () => {
		expect(toKebabCase("output dir")).toBe("output-dir");
	});

	test("lowercases single word", () => {
		expect(toKebabCase("Todo")).toBe("todo");
	});

	test("handles already kebab-case", () => {
		expect(toKebabCase("already-kebab")).toBe("already-kebab");
	});

	test("handles empty string", () => {
		expect(toKebabCase("")).toBe("");
	});

	test("property: output is always lowercase", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				expect(toKebabCase(input)).toBe(toKebabCase(input).toLowerCase());
			}),
		);
	});

	test("property: output never contains underscores or spaces", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				const result = toKebabCase(input);
				expect(result.includes("_")).toBe(false);
				expect(result.includes(" ")).toBe(false);
			}),
		);
	});

	test("property: idempotent on kebab-case output", () => {
		fc.assert(
			fc.property(fc.stringMatching(/^[a-z]+$/), (input) => {
				const once = toKebabCase(input);
				expect(toKebabCase(once)).toBe(once);
			}),
		);
	});
});

describe("toCamelCase", () => {
	test("converts kebab-case", () => {
		expect(toCamelCase("add-package")).toBe("addPackage");
	});

	test("converts snake_case", () => {
		expect(toCamelCase("output_dir")).toBe("outputDir");
	});

	test("handles single word", () => {
		expect(toCamelCase("todo")).toBe("todo");
	});

	test("handles multiple segments", () => {
		expect(toCamelCase("my-long-variable-name")).toBe("myLongVariableName");
	});

	test("lowercases first character", () => {
		expect(toCamelCase("Todo")).toBe("todo");
	});

	test("handles empty string", () => {
		expect(toCamelCase("")).toBe("");
	});

	test("property: output never contains hyphens or underscores", () => {
		fc.assert(
			fc.property(fc.stringMatching(/^[a-z][a-z_-]*$/), (input) => {
				const result = toCamelCase(input);
				expect(result.includes("-")).toBe(false);
				expect(result.includes("_")).toBe(false);
			}),
		);
	});
});

describe("toPascalCase", () => {
	test("converts single word", () => {
		expect(toPascalCase("todo")).toBe("Todo");
	});

	test("converts kebab-case", () => {
		expect(toPascalCase("todo-item")).toBe("TodoItem");
	});

	test("converts snake_case", () => {
		expect(toPascalCase("todo_item")).toBe("TodoItem");
	});

	test("handles already PascalCase with delimiters", () => {
		expect(toPascalCase("todoItem")).toBe("TodoItem");
	});

	test("handles empty string", () => {
		expect(toPascalCase("")).toBe("");
	});

	test("property: first char is uppercase for non-empty alphabetic input", () => {
		fc.assert(
			fc.property(fc.stringMatching(/^[a-z][a-z_-]*$/), (input) => {
				const result = toPascalCase(input);
				if (result.length > 0) {
					expect(result[0]).toBe(result[0]!.toUpperCase());
				}
			}),
		);
	});

	test("property: output never contains hyphens or underscores", () => {
		fc.assert(
			fc.property(fc.stringMatching(/^[a-z_-]+$/), (input) => {
				const result = toPascalCase(input);
				expect(result.includes("-")).toBe(false);
				expect(result.includes("_")).toBe(false);
			}),
		);
	});
});

describe("toTitleCase", () => {
	test("converts camelCase", () => {
		expect(toTitleCase("addPackage")).toBe("Add Package");
	});

	test("converts PascalCase", () => {
		expect(toTitleCase("AddPackage")).toBe("Add Package");
	});

	test("handles multiple words", () => {
		expect(toTitleCase("generateCliApp")).toBe("Generate Cli App");
	});

	test("handles single lowercase word", () => {
		expect(toTitleCase("hello")).toBe("Hello");
	});

	test("handles empty string", () => {
		expect(toTitleCase("")).toBe("");
	});
});

describe("toEnvironmentPrefix", () => {
	test("converts kebab-case to SCREAMING_SNAKE_CASE", () => {
		expect(toEnvironmentPrefix("my-app")).toBe("MY_APP");
	});

	test("uppercases camelCase without splitting", () => {
		expect(toEnvironmentPrefix("todoApi")).toBe("TODOAPI");
	});

	test("handles already uppercase", () => {
		expect(toEnvironmentPrefix("MY_APP")).toBe("MY_APP");
	});

	test("handles empty string", () => {
		expect(toEnvironmentPrefix("")).toBe("");
	});

	test("property: output is always uppercase", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				expect(toEnvironmentPrefix(input)).toBe(
					toEnvironmentPrefix(input).toUpperCase(),
				);
			}),
		);
	});

	test("property: output never contains hyphens", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				expect(toEnvironmentPrefix(input).includes("-")).toBe(false);
			}),
		);
	});
});
