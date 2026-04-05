import { configs } from "@morphdsl/eslint-config";

export default [
	{ ignores: ["codemirror-lang-morph/"] },
	...configs.recommended,
	...configs.cli,
];
