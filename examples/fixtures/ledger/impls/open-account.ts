// Handler implementation for openAccount

import { Effect, Layer } from "effect";

import { accountId } from "@ledger/accounts-dsl";
import { IdGenerator, AccountRepository } from "../../services";
import { OpenAccountHandler } from "./handler";

export const OpenAccountHandlerLive = Layer.effect(
	OpenAccountHandler,
	Effect.gen(function* () {
		const idGen = yield* IdGenerator;
		const accountRepo = yield* AccountRepository;

		return {
			handle: (params) =>
				Effect.gen(function* () {
					const id = yield* idGen.generate();
					const account = {
						id: accountId(id),
						name: params.name,
						balance: params.initialDeposit,
					};

					yield* accountRepo.save(account).pipe(Effect.orDie);
					return account;
				}),
		};
	}),
);
