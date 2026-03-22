// Handler implementation for createShipment

import { Effect, Layer } from "effect";

import type { Shipment, ShipmentId } from "@delivery-tracker/tracking-dsl";
import { WarehouseNotFoundError } from "@delivery-tracker/tracking-dsl";
import {
	IdGenerator,
	ShipmentRepository,
	WarehouseRepository,
} from "../../services";

import { CreateShipmentHandler } from "./handler";

export const CreateShipmentHandlerLive = Layer.effect(
	CreateShipmentHandler,
	Effect.gen(function* () {
		const idGen = yield* IdGenerator;
		const shipmentRepo = yield* ShipmentRepository;
		const warehouseRepo = yield* WarehouseRepository;

		return {
			handle: (params, _options) =>
				Effect.gen(function* () {
					const warehouse = yield* warehouseRepo
						.findById(params.warehouseId)
						.pipe(
							Effect.mapError(
								(e) =>
									new WarehouseNotFoundError({
										message: e.message,
									}),
							),
						);
					if (!warehouse) {
						return yield* Effect.fail(
							new WarehouseNotFoundError({
								message: `Warehouse not found: ${params.warehouseId}`,
							}),
						);
					}

					const id = (yield* idGen.generate()) as ShipmentId;
					const shipment: Shipment = {
						id,
						origin: params.origin,
						destination: params.destination,
					};
					yield* shipmentRepo.save(shipment).pipe(Effect.orDie);
					return shipment;
				}),
		};
	}),
);
