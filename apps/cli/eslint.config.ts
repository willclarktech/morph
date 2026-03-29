import { configs } from "@morphdsl/eslint-config";

export default [
	{ ignores: ["**/*.template.ts"] },
	...configs.generated,
	...configs.cli,
];
