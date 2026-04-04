declare module "@morphdsl/generation-impls" {
	import type { DomainSchema, GeneratedFile } from "@morphdsl/domain-schema";
	import type { Effect } from "effect";

	export const executeGenerate: (
		schema: DomainSchema,
		name: string,
	) => Effect.Effect<{ files: GeneratedFile[] }>;
}
