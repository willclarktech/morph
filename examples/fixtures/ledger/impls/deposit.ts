// Handler implementation for deposit

import { Effect, Layer } from "effect";

import { AccountRepository } from "../../services";
import { DepositHandler } from "./handler";

export const DepositHandlerLive = Layer.effect(
	DepositHandler,
	Effect.gen(function* () {
		const accountRepo = yield* AccountRepository;

		return {
			handle: (params) =>
				Effect.gen(function* () {
					const existing = yield* accountRepo
						.findById(params.accountId)
						.pipe(Effect.orDie);

					if (!existing) {
						return yield* Effect.die(
							new Error(`Account ${params.accountId} not found`),
						);
					}

					const updated = {
						...existing,
						balance: existing.balance + params.amount,
					};

					yield* accountRepo.save(updated).pipe(Effect.orDie);
					return updated;
				}),
		};
	}),
);
