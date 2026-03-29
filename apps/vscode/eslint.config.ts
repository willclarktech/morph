import { configs } from "@morphdsl/eslint-config";

export default [{ ignores: ["**/*.template.ts", "dist/**"] }, ...configs.generated];
