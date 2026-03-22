// Handler implementation for withdraw

import { Effect, Layer } from "effect";

import { InsufficientFundsError } from "@ledger/accounts-dsl";
import { AccountRepository } from "../../services";
import { WithdrawHandler } from "./handler";

export const WithdrawHandlerLive = Layer.effect(
	WithdrawHandler,
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

					if (existing.balance < params.amount) {
						return yield* Effect.fail(
							new InsufficientFundsError({
								message: `Insufficient funds: balance ${existing.balance}, withdrawal ${params.amount}`,
							}),
						);
					}

					const updated = {
						...existing,
						balance: existing.balance - params.amount,
					};

					yield* accountRepo.save(updated).pipe(Effect.orDie);
					return updated;
				}),
		};
	}),
);
