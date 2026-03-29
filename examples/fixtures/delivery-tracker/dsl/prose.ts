import type { Prose } from "@morphdsl/operation";

import type * as ops from "./tracking";

export const prose: Prose<typeof ops> = {
	createShipment:
		'{actor} creates a shipment from "{origin}" to "{destination}"',
	updateStatus: "{actor} updates status to {status}",
	getShipment: "{actor} gets the shipment",
};
