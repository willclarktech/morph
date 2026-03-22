/**
 * Prose templates for ledger operations.
 *
 * This file is a FIXTURE - hand-written, survives regeneration.
 */
import type { Prose } from "@morph/operation";

import type * as ops from "./accounts";

export const prose: Prose<typeof ops> = {
	openAccount: '{actor} opens account "{name}" with initial deposit {initialDeposit}',
	deposit: "{actor} deposits {amount} into account {accountId}",
	withdraw: "{actor} withdraws {amount} from account {accountId}",
	getBalance: "{actor} checks the balance of account {accountId}",
	getStatement: "{actor} views the statement for account {accountId}",
};
