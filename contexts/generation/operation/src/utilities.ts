import type * as S from "effect/Schema";

export const getFieldNames = (schema: S.Schema.All): string[] => {
	const ast = schema.ast;
	if (ast._tag === "TypeLiteral") {
		return ast.propertySignatures.map((propertySignature) =>
			String(propertySignature.name),
		);
	}
	return [];
};
