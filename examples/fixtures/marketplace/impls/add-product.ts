// Handler implementation for addProduct

import { Effect, Layer } from "effect";

import type { Product, ProductId } from "@marketplace/catalog-dsl";
import { IdGenerator, ProductRepository } from "../../services";

import { AddProductHandler } from "./handler";

export const AddProductHandlerLive = Layer.effect(
	AddProductHandler,
	Effect.gen(function* () {
		const idGen = yield* IdGenerator;
		const repo = yield* ProductRepository;

		return {
			handle: (params, _options) =>
				Effect.gen(function* () {
					const id = (yield* idGen.generate()) as ProductId;
					const product: Product = {
						id,
						name: params.name,
						description: params.description,
						price: params.price,
					};
					yield* repo.save(product).pipe(Effect.orDie);
					return product;
				}),
		};
	}),
);
