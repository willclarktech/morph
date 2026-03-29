import type { TypeRef } from "@morphdsl/domain-schema";

export const typeRefToProto = (typeRef: TypeRef): string => {
	switch (typeRef.kind) {
		case "entity":
		case "type":
		case "valueObject": {
			return typeRef.name;
		}
		case "entityId": {
			return "string";
		}
		case "function": {
			return "google.protobuf.Any";
		}
		case "generic": {
			return typeRef.name;
		}
		case "optional": {
			return `optional ${typeRefToProto(typeRef.inner)}`;
		}
		case "primitive": {
			switch (typeRef.name) {
				case "boolean": {
					return "bool";
				}
				case "date":
				case "datetime": {
					return "google.protobuf.Timestamp";
				}
				case "float": {
					return "double";
				}
				case "integer": {
					return "int64";
				}
				case "string": {
					return "string";
				}
				case "unknown": {
					return "google.protobuf.Any";
				}
				case "void": {
					return "google.protobuf.Empty";
				}
			}
		}
		// eslint-disable-next-line no-fallthrough -- exhaustive primitive names above
		case "array": {
			return `repeated ${typeRefToProto(typeRef.element)}`;
		}
		case "typeParam": {
			return "google.protobuf.Any";
		}
		case "union": {
			return "string";
		}
	}
};

export const isTimestampType = (typeRef: TypeRef): boolean =>
	typeRef.kind === "primitive" &&
	(typeRef.name === "date" || typeRef.name === "datetime");

export const needsTimestampImport = (
	typeReferences: readonly TypeRef[],
): boolean => typeReferences.some(isTimestampType);
