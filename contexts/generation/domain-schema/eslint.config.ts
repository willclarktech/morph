import config, { configs } from "@morph/eslint-config";

export default [
	...config,
	...configs.imperative,
	{
		// Gherkin uses Given/When/Then - "then" is a valid domain term
		rules: {
			"unicorn/no-thenable": "off",
		},
	},
];
