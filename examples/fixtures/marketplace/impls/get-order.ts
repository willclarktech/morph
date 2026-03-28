// Handler implementation for getOrder

import { Effect, Layer } from "effect";

import { OrderNotFoundError } from "@marketplace/orders-dsl";
import { OrderRepository } from "../../services";

import { GetOrderHandler } from "./handler";

export const GetOrderHandlerLive = Layer.effect(
	GetOrderHandler,
	Effect.gen(function* () {
		const repo = yield* OrderRepository;

		return {
			handle: (params, _options) =>
				Effect.gen(function* () {
					const order = yield* repo
						.findById(params.orderId)
						.pipe(
							Effect.mapError(
								(error) =>
									new OrderNotFoundError({ message: error.message }),
							),
						);
					if (!order) {
						return yield* Effect.fail(
							new OrderNotFoundError({
								message: `Order not found: ${params.orderId}`,
							}),
						);
					}
					return order;
				}),
		};
	}),
);
