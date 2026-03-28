// Handler implementation for getStatement

import { Effect, Layer } from "effect";

import type { DomainEvent, Transaction } from "@ledger/accounts-dsl";
import { AccountNotFoundError } from "@ledger/accounts-dsl";
import { AccountRepository, EventStore } from "../../services";
import { GetStatementHandler } from "./handler";

export const GetStatementHandlerLive = Layer.effect(
	GetStatementHandler,
	Effect.gen(function* () {
		const accountRepo = yield* AccountRepository;
		const eventStore = yield* EventStore;

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

					const events = yield* eventStore
						.getByAggregateId(params.accountId)
						.pipe(Effect.orDie);

					const transactions: Transaction[] = events
						.filter(
							(event: DomainEvent) =>
								event._tag === "FundsDeposited" ||
								event._tag === "FundsWithdrawn" ||
								event._tag === "AccountOpened",
						)
						.map((event: DomainEvent) => {
							const p = event.params as Record<string, unknown>;
							const isWithdraw = event._tag === "FundsWithdrawn";
							const amount = isWithdraw
								? -(p["amount"] as number)
								: ((p["amount"] as number | undefined) ??
									(p["initialDeposit"] as number | undefined) ??
									0);
							return {
								amount,
								description:
									(p["description"] as string | undefined) ??
									`Account opened: ${(p["name"] as string | undefined) ?? ""}`,
								timestamp: event.occurredAt,
							};
						});

					return transactions;
				}),
		};
	}),
);
