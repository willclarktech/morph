// Handler implementation for getBalance

import { Effect, Layer } from "effect";

import { AccountNotFoundError } from "@ledger/accounts-dsl";
import { AccountRepository } from "../../services";
import { GetBalanceHandler } from "./handler";

export const GetBalanceHandlerLive = Layer.effect(
	GetBalanceHandler,
	Effect.gen(function* () {
		const accountRepo = yield* AccountRepository;

		return {
			handle: (params) =>
				Effect.gen(function* () {
					const account = yield* accountRepo
						.findById(params.accountId)
						.pipe(Effect.orDie);

					if (!account) {
						return yield* Effect.fail(
							new AccountNotFoundError({
								message: `Account ${params.accountId} not found`,
							}),
						);
					}

					return account;
				}),
		};
	}),
);
