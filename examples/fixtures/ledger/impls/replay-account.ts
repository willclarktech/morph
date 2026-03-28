// Handler implementation for replayAccount

import { Effect, Layer } from "effect";

import type { DomainEvent, ReplayStep } from "@ledger/accounts-dsl";
import { AccountNotFoundError } from "@ledger/accounts-dsl";
import { AccountRepository, EventStore } from "../../services";
import { ReplayAccountHandler } from "./handler";

export const ReplayAccountHandlerLive = Layer.effect(
	ReplayAccountHandler,
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

					let balance = 0;
					const steps: ReplayStep[] = events.map(
						(domainEvent: DomainEvent, index: number) => {
							const p = domainEvent.params as Record<string, unknown>;
							const r = domainEvent.result as Record<string, unknown>;
							balance = (r["balance"] as number | undefined) ?? balance;

							let description: string;
							switch (domainEvent._tag) {
								case "AccountOpened": {
									description = `Account opened "${p["name"] as string}" with initial deposit of ${p["initialDeposit"] as number}`;
									break;
								}
								case "FundsDeposited": {
									description = `Deposited ${p["amount"] as number}: ${p["description"] as string}`;
									break;
								}
								case "FundsWithdrawn": {
									description = `Withdrew ${p["amount"] as number}: ${p["description"] as string}`;
									break;
								}
								default: {
									description = domainEvent._tag;
								}
							}

							return {
								step: BigInt(index + 1),
								event: domainEvent._tag,
								description,
								balanceAfter: balance,
								timestamp: domainEvent.occurredAt,
							};
						},
					);

					return steps;
				}),
		};
	}),
);
