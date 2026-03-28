export { createExtension, type ExtensionConfig } from "./extension-factory";

export {
	type ContextPackages,
	generate,
	type GenerateVsCodeAppOptions,
} from "./generate";

export {
	type CommandOp,
	generateVsCodePackageJson,
	type VsCodePackageJsonOptions,
} from "./package-json";
