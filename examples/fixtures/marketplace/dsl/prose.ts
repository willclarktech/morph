import type { Prose } from "@morphdsl/operation";

import type * as ops from "./catalog";

export const prose: Prose<typeof ops> = {
	addProduct: '{actor} adds a product "{name}" at ${price}',
	listProducts: "{actor} lists all products",
};
