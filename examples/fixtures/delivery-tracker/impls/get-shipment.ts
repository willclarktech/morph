// Handler implementation for getShipment

import { Effect, Layer } from "effect";

import { ShipmentNotFoundError } from "@delivery-tracker/tracking-dsl";
import { ShipmentRepository } from "../../services";

import { GetShipmentHandler } from "./handler";

export const GetShipmentHandlerLive = Layer.effect(
	GetShipmentHandler,
	Effect.gen(function* () {
		const repo = yield* ShipmentRepository;

		return {
			handle: (params, _options) =>
				Effect.gen(function* () {
					const shipment = yield* repo
						.findById(params.shipmentId)
						.pipe(
							Effect.mapError(
								(e) =>
									new ShipmentNotFoundError({
										message: e.message,
									}),
							),
						);
					if (!shipment) {
						return yield* Effect.fail(
							new ShipmentNotFoundError({
								message: `Shipment not found: ${params.shipmentId}`,
							}),
						);
					}
					return shipment;
				}),
		};
	}),
);
