import type { Ref } from "effect";

type StoreRef = Ref.Ref<Map<string, string>>;

const registry = new Map<string, StoreRef>();

export const getStoreRegistry = (): Map<string, StoreRef> => registry;

export const registerStore = (name: string, store: StoreRef): void => {
	registry.set(name, store);
};

export const clearStoreRegistry = (): void => {
	registry.clear();
};
