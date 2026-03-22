// Handler implementation for placeOrder

import { Effect, Layer } from "effect";

import type { Order, OrderId } from "@marketplace/orders-dsl";
import { ProductNotFoundError } from "@marketplace/orders-dsl";
import { IdGenerator, OrderRepository } from "../../services";

import { PlaceOrderHandler } from "./handler";

export const PlaceOrderHandlerLive = Layer.effect(
	PlaceOrderHandler,
	Effect.gen(function* () {
		const idGen = yield* IdGenerator;
		const repo = yield* OrderRepository;

		return {
			handle: (params, _options) =>
				Effect.gen(function* () {
					if (!params.productId) {
						return yield* Effect.fail(
							new ProductNotFoundError({
								message: "Product ID is required",
							}),
						);
					}

					const id = (yield* idGen.generate()) as OrderId;
					const order: Order = {
						id,
						productId: params.productId,
						quantity: params.quantity,
						status: "pending",
					};
					yield* repo.save(order).pipe(Effect.orDie);
					return order;
				}),
		};
	}),
);
