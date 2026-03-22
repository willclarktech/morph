// Handler implementation for listProducts

import { Effect, Layer } from "effect";

import { ProductRepository } from "../../services";

import { ListProductsHandler } from "./handler";

export const ListProductsHandlerLive = Layer.effect(
	ListProductsHandler,
	Effect.gen(function* () {
		const repo = yield* ProductRepository;

		return {
			handle: (_params, _options) =>
				Effect.gen(function* () {
					const result = yield* repo.findAll().pipe(Effect.orDie);
					return [...result.items];
				}),
		};
	}),
);
