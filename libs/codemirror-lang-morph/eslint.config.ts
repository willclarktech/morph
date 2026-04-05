import { configs } from "@morphdsl/eslint-config";

export default [
	...configs.recommended,
	...configs.imperative,
	{
		rules: {
			// CodeMirror APIs use null (not undefined) and StreamLanguage.match() (not RegExp.test())
			"unicorn/no-null": "off",
			"unicorn/prefer-regexp-test": "off",
		},
	},
];
