import config, { configs } from "@morph/eslint-config";

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
