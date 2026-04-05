/**
 * ESLint flat config for the monorepo.
 *
 * Note: We use `as Linter.Config` casts for some plugin configs because
 * @typescript-eslint and @eslint/core have incompatible LanguageOptions types.
 * This is a known issue with the ESLint flat config ecosystem's type definitions.
 */
import type { Linter } from "eslint";

import eslint from "@eslint/js";
import functionalPlugin from "eslint-plugin-functional";
import importPlugin from "eslint-plugin-import";
import perfectionistPlugin from "eslint-plugin-perfectionist";
import prettierRecommendedConfig from "eslint-plugin-prettier/recommended";
import promisePlugin from "eslint-plugin-promise";
import * as regexpPlugin from "eslint-plugin-regexp";
import unicornPlugin from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

type ConfigArray = Linter.Config[];
type Preset = "cli" | "generated" | "imperative" | "recommended";

const jsFiles = ["**/*.{cjs,mjs,js,jsx}"];
const testFiles = ["**/*.test.*"];

const ignoreConfig: Linter.Config = {
	ignores: ["**/dist/**", "**/viz/**"],
};

/**
 * Ignores for morph-generated projects.
 * - cucumber.js: Cucumber config file (JS, not TS)
 * - steps/**: Step definitions use World with index signatures
 */
const generatedIgnoreConfig: Linter.Config = {
	ignores: ["cucumber.js", "steps/**"],
};

const generatedRuleOverridesConfig: Linter.Config = {
	rules: {
		"@typescript-eslint/no-unnecessary-condition": "off",
		"@typescript-eslint/require-await": "off",
		"unicorn/no-useless-spread": "off",
	},
};

const linterOptionsConfig: Linter.Config = {
	linterOptions: {
		reportUnusedDisableDirectives: "error",
		reportUnusedInlineConfigs: "error",
	},
};

const importConfigOverrides: Linter.Config = {
	rules: {
		"import/no-unresolved": "off",
	},
};

const tsParserConfig: Linter.Config = {
	languageOptions: {
		parserOptions: {
			projectService: {
				allowDefaultProject: ["*.config.ts"],
			},
		},
	},
};

const jsDisableTypeCheckedConfig: Linter.Config = {
	files: jsFiles,
	...(tseslint.configs.disableTypeChecked as Linter.Config),
};

const jsFunctionalDisableTypeCheckedConfig: Linter.Config = {
	files: jsFiles,
	...(functionalPlugin.configs.disableTypeChecked as Linter.Config),
};

const ruleOverridesConfig: Linter.Config = {
	rules: {
		"@typescript-eslint/consistent-type-imports": [
			"error",
			{
				fixStyle: "separate-type-imports",
				prefer: "type-imports",
			},
		],
		"@typescript-eslint/no-import-type-side-effects": "error",
		"@typescript-eslint/no-unused-vars": [
			"error",
			{
				args: "all",
				argsIgnorePattern: "^_",
				caughtErrors: "all",
				caughtErrorsIgnorePattern: "^_",
				destructuredArrayIgnorePattern: "^_",
				ignoreRestSiblings: true,
				varsIgnorePattern: "^_",
			},
		],
		"@typescript-eslint/restrict-template-expressions": [
			"error",
			{ allowNumber: true },
		],
		"func-style": ["error", "expression"],
		"import/consistent-type-specifier-style": ["error", "prefer-top-level"],
		"no-console": ["warn", { allow: ["error", "info", "table", "warn"] }],
		"no-restricted-syntax": [
			"error",
			{
				message: "Use string literal unions instead of enums",
				selector: "TSEnumDeclaration",
			},
		],
		"prefer-arrow-callback": "error",
		"unicorn/no-immediate-mutation": "off",
		"unicorn/no-nested-ternary": "off",
		"unicorn/prefer-single-call": "off",
		"unicorn/prevent-abbreviations": [
			"error",
			{
				allowList: {
					args: true,
					def: true,
					Def: true,
					dev: true,
					Dir: true,
					dir: true,
					dirs: true,
					docs: true,
					Docs: true,
					env: true,
					Param: true,
					param: true,
					Params: true,
					params: true,
					prop: true,
					Prop: true,
					props: true,
					ref: true,
					Ref: true,
				},
				ignore: [/e2e/i],
			},
		],
	},
};

const testFileConfig: Linter.Config = {
	files: testFiles,
	...(functionalPlugin.configs.off as Linter.Config),
	rules: {
		...(functionalPlugin.configs.off as Linter.Config).rules,
		"@typescript-eslint/no-confusing-void-expression": "off",
		"@typescript-eslint/no-empty-function": "off",
		"@typescript-eslint/no-explicit-any": "off",
		"@typescript-eslint/no-non-null-assertion": "off",
		"@typescript-eslint/no-require-imports": "off",
		"@typescript-eslint/no-unsafe-argument": "off",
		"@typescript-eslint/no-unsafe-assignment": "off",
		"@typescript-eslint/no-unsafe-call": "off",
		"@typescript-eslint/no-unsafe-member-access": "off",
		"@typescript-eslint/no-unsafe-return": "off",
		"@typescript-eslint/require-await": "off",
		"no-empty": "off",
		"unicorn/no-null": "off",
		"unicorn/prevent-abbreviations": "off",
	},
};

/**
 * Schema files have semantically meaningful key order (given/when/then, operation params).
 * Disable perfectionist sorting to preserve intentional ordering.
 */
const schemaFileConfig: Linter.Config = {
	files: ["**/schema.json", "**/schema.ts", "**/*.schema.ts"],
	rules: {
		"perfectionist/sort-objects": "off",
	},
};

/**
 * Perfectionist rule overrides.
 * Keep import sorting (helps readability, reduces merge conflicts).
 * Disable object/interface/export sorting (semantic order often preferable).
 */
const perfectionistOverridesConfig: Linter.Config = {
	rules: {
		"perfectionist/sort-classes": "off",
		"perfectionist/sort-enums": "off",
		"perfectionist/sort-exports": "off",
		"perfectionist/sort-interfaces": "off",
		"perfectionist/sort-intersection-types": "off",
		"perfectionist/sort-modules": "off",
		"perfectionist/sort-object-types": "off",
		"perfectionist/sort-objects": "off",
		"perfectionist/sort-union-types": "off",
		// Keep: sort-imports, sort-named-imports, sort-named-exports
	},
};

/**
 * Effect TS compatibility rules.
 * Effect's design patterns conflict with some functional/unicorn rules.
 *
 * Effect enforces purity through its type system, not ESLint.
 * These rules conflict with idiomatic Effect code:
 * - no-expression-statements: Effect.runPromise, console.error, etc.
 * - no-let: accumulating results in Effect handlers
 * - no-throw-statements: Effect.die for defects
 *
 * Additional rules disabled for practical reasons:
 * - immutable-data: Mutating local state in generators/handlers
 * - no-loop-statements: for...of in generators
 * - no-conditional-statements: if statements are clearer than ternaries
 * - no-return-void: Effect handlers often return void
 * - prefer-immutable-types: Too strict for handler parameters
 *
 * TODO: Revisit these rules - see P4 backlog item
 */
const effectConfig: Linter.Config = {
	rules: {
		// Effect distinguishes Effect<void> from Effect<undefined>, so explicit undefined is required
		"@typescript-eslint/no-confusing-void-expression": "off",
		"functional/functional-parameters": "off",
		"functional/immutable-data": "off",
		"functional/no-class-inheritance": "off",
		"functional/no-classes": "off",
		"functional/no-conditional-statements": "off",
		"functional/no-expression-statements": "off",
		"functional/no-let": "off",
		"functional/no-loop-statements": "off",
		"functional/no-mixed-types": "off",
		"functional/no-return-void": "off",
		"functional/no-throw-statements": "off",
		"functional/prefer-immutable-types": "off",
		"unicorn/consistent-function-scoping": "off",
		"unicorn/no-array-callback-reference": "off",
		"unicorn/no-array-method-this-argument": "off",
		"unicorn/no-array-sort": "off",
		"unicorn/no-thenable": "off",
		// Effect.succeed(undefined) and Ref.make(undefined) need explicit undefined
		"unicorn/no-useless-undefined": "off",
	},
};

export const configs: Record<Preset, ConfigArray> = {
	/**
	 * Config for CLI apps where imperative code is expected.
	 * Disables functional rules and allows process.exit().
	 */
	cli: [
		functionalPlugin.configs.off as Linter.Config,
		{
			rules: {
				"unicorn/no-process-exit": "off",
			},
		},
	],

	/**
	 * Config for morph-generated projects.
	 * Adds ignores for cucumber.js and steps/ on top of recommended.
	 */
	generated: [
		generatedIgnoreConfig,
		ignoreConfig,
		linterOptionsConfig,
		eslint.configs.recommended,
		prettierRecommendedConfig,
		...tseslint.configs.strictTypeChecked,
		...tseslint.configs.stylisticTypeChecked,
		functionalPlugin.configs.recommended as Linter.Config,
		functionalPlugin.configs.externalTypeScriptRecommended as Linter.Config,
		importPlugin.flatConfigs.recommended,
		importPlugin.flatConfigs.typescript,
		importConfigOverrides,
		perfectionistPlugin.configs["recommended-natural"],
		perfectionistOverridesConfig,
		promisePlugin.configs["flat/recommended"],
		regexpPlugin.configs["flat/recommended"],
		unicornPlugin.configs.recommended,
		tsParserConfig,
		jsFunctionalDisableTypeCheckedConfig,
		jsDisableTypeCheckedConfig,
		ruleOverridesConfig,
		generatedRuleOverridesConfig,
		testFileConfig,
		schemaFileConfig,
		effectConfig,
	],

	/**
	 * Config for imperative/generator code.
	 * Disables all functional rules.
	 */
	imperative: [functionalPlugin.configs.off as Linter.Config],

	recommended: [
		ignoreConfig,
		linterOptionsConfig,
		eslint.configs.recommended,
		prettierRecommendedConfig,
		...tseslint.configs.strictTypeChecked,
		...tseslint.configs.stylisticTypeChecked,
		functionalPlugin.configs.recommended as Linter.Config,
		functionalPlugin.configs.externalTypeScriptRecommended as Linter.Config,
		importPlugin.flatConfigs.recommended,
		importPlugin.flatConfigs.typescript,
		importConfigOverrides,
		perfectionistPlugin.configs["recommended-natural"],
		perfectionistOverridesConfig,
		promisePlugin.configs["flat/recommended"],
		regexpPlugin.configs["flat/recommended"],
		unicornPlugin.configs.recommended,
		tsParserConfig,
		jsFunctionalDisableTypeCheckedConfig,
		jsDisableTypeCheckedConfig,
		ruleOverridesConfig,
		testFileConfig,
		schemaFileConfig,
		effectConfig,
	],
};

const defaultConfig: ConfigArray = configs.recommended;
export default defaultConfig;
