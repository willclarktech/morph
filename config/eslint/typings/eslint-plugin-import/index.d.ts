declare module "eslint-plugin-import" {
	import type { Linter } from "eslint";
	const plugin: {
		flatConfigs: {
			recommended: Linter.Config;
			typescript: Linter.Config;
		};
	};
	export default plugin;
}
