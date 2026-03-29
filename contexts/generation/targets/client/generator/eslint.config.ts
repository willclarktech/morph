import { configs } from "@morphdsl/eslint-config";

export default [
	...configs.recommended,
	{
		// Generators read schemas to produce strings - deep immutability not needed
		rules: {
			"functional/prefer-immutable-types": "off",
		},
	},
];
