import type { Prose } from "@morphdsl/operation";

import type * as ops from "./orders";

export const prose: Prose<typeof ops> = {
	placeOrder: '{actor} places an order for product "{productId}"',
	getOrder: "{actor} retrieves an order",
};
