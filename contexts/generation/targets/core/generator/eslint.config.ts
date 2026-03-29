import config, { configs } from "@morphdsl/eslint-config";

export default [
	...config,
	...configs.imperative,
	{
		// Gherkin step definitions use Given/When/Then - `then` is a valid property
		files: ["**/*.test.*"],
		rules: {
			"unicorn/no-thenable": "off",
		},
	},
];
