// Handler implementation for parseNumber function

import type { Result } from "@type-gallery/types-dsl";

import { Effect, Layer } from "effect";

import { ParseNumberHandler } from "./handler";

export const ParseNumberHandlerLive = Layer.succeed(ParseNumberHandler, {
	handle: (params, _options) =>
		Effect.gen(function* () {
			const parsed = Number(params.raw);
			if (Number.isNaN(parsed)) {
				const result: Result<number, string> = {
					kind: "err",
					error: `Cannot parse "${params.raw}" as a number`,
				};
				return result;
			}
			const result: Result<number, string> = {
				kind: "ok",
				value: parsed,
			};
			return result;
		}),
});
