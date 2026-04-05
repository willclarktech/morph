import { compile } from "@morphdsl/schema-dsl-compiler";
import { decompile } from "@morphdsl/schema-dsl-decompiler";
import { parse } from "@morphdsl/schema-dsl-parser";

export const formatMorph = (source: string): string | undefined => {
	const parseResult = parse(source);
	if (!parseResult.ast || parseResult.errors.length > 0) return undefined;

	const compileResult = compile(parseResult.ast);
	if (!compileResult.schema || compileResult.errors.length > 0)
		return undefined;

	return decompile(compileResult.schema);
};
