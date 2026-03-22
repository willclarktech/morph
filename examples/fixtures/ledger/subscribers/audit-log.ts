// Subscriber implementation for auditLog

import { Effect, Layer } from "effect";

import { AuditLogSubscriber } from "./index";

export const AuditLogSubscriberLive = Layer.succeed(AuditLogSubscriber, {
	handle: (event) =>
		Effect.gen(function* () {
			yield* Effect.logInfo(`[Audit] ${event._tag} at ${event.occurredAt}`);

			switch (event._tag) {
				case "AccountOpened": {
					yield* Effect.logDebug(
						`Account opened: "${event.result.name}" with balance ${event.result.balance}`,
					);
					break;
				}
				case "FundsDeposited": {
					yield* Effect.logDebug(
						`Deposited ${event.params.amount} to ${event.params.accountId}`,
					);
					break;
				}
				case "FundsWithdrawn": {
					yield* Effect.logDebug(
						`Withdrew ${event.params.amount} from ${event.params.accountId}`,
					);
					break;
				}
			}
		}),
});
