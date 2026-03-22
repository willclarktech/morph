// Handler implementation for findByCity

import { Effect, Layer } from "effect";

import { ContactRepository } from "../../services";

import { FindByCityHandler } from "./handler";

export const FindByCityHandlerLive = Layer.effect(
	FindByCityHandler,
	Effect.gen(function* () {
		const repo = yield* ContactRepository;

		return {
			handle: (params, _options) =>
				Effect.gen(function* () {
					const result = yield* repo.findAll().pipe(Effect.orDie);
					return result.items.filter(
						(c) => c.address.city === params.city,
					);
				}),
		};
	}),
);
