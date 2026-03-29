import config, { configs } from "@morphdsl/eslint-config";

export default [
	...config,
	...configs.imperative,
	{
		files: ["**/*.test.*"],
		rules: {
			"unicorn/no-thenable": "off",
		},
	},
];
