// Handler implementation for updateStatus

import { Effect, Layer } from "effect";

import type { TrackingRecord } from "@delivery-tracker/tracking-dsl";
import { TrackingRecordNotFoundError } from "@delivery-tracker/tracking-dsl";
import { TrackingRecordRepository } from "../../services";

import { UpdateStatusHandler } from "./handler";

export const UpdateStatusHandlerLive = Layer.effect(
	UpdateStatusHandler,
	Effect.gen(function* () {
		const repo = yield* TrackingRecordRepository;

		return {
			handle: (params, _options) =>
				Effect.gen(function* () {
					const record = yield* repo.findById(params.trackingRecordId).pipe(Effect.mapError((e) => new TrackingRecordNotFoundError({ message: e.message })));
					if (!record) {
						return yield* Effect.fail(
							new TrackingRecordNotFoundError({
								message: `Tracking record not found: ${params.trackingRecordId}`,
							}),
						);
					}

					const updated: TrackingRecord = {
						...record,
						status: params.status,
					};
					yield* repo.save(updated).pipe(Effect.orDie);
					return updated;
				}),
		};
	}),
);
