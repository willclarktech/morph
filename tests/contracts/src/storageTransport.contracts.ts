import { contractProperty } from "@morph/property";
import * as fc from "fast-check";
import { Effect } from "effect";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const storageTransportContracts = (createTransport: () => Effect.Effect<any, any>) => [
	contractProperty({
		name: "PutGetRoundtrip",
		description: "put then get returns stored value",
		port: "StorageTransport",
		arbitrary: fc.record({ key: fc.uuid(), value: fc.uuid() }),
		law: async ({ key, value }) => {
			return Effect.runPromise(Effect.gen(function*() {
				const t = yield* createTransport();
				yield* t.put(key, value);
				return (yield* t.get(key)) === value;
			}).pipe(Effect.orDie) as Effect.Effect<boolean>);
		},
	}),
	contractProperty({
		name: "GetUnknownKey",
		description: "get on unknown key returns undefined",
		port: "StorageTransport",
		arbitrary: fc.record({ key: fc.uuid() }),
		law: async ({ key }) => {
			return Effect.runPromise(Effect.gen(function*() {
				const t = yield* createTransport();
				return (yield* t.get(key)) === undefined;
			}).pipe(Effect.orDie) as Effect.Effect<boolean>);
		},
	}),
	contractProperty({
		name: "PutOverwrite",
		description: "put overwrites previous value for same key",
		port: "StorageTransport",
		arbitrary: fc.record({ key: fc.uuid(), v1: fc.uuid(), v2: fc.uuid() }),
		law: async ({ key, v1, v2 }) => {
			return Effect.runPromise(Effect.gen(function*() {
				const t = yield* createTransport();
				yield* t.put(key, v1);
				yield* t.put(key, v2);
				return (yield* t.get(key)) === v2;
			}).pipe(Effect.orDie) as Effect.Effect<boolean>);
		},
	}),
	contractProperty({
		name: "RemoveGet",
		description: "remove then get returns undefined",
		port: "StorageTransport",
		arbitrary: fc.record({ key: fc.uuid(), value: fc.uuid() }),
		law: async ({ key, value }) => {
			return Effect.runPromise(Effect.gen(function*() {
				const t = yield* createTransport();
				yield* t.put(key, value);
				yield* t.remove(key);
				return (yield* t.get(key)) === undefined;
			}).pipe(Effect.orDie) as Effect.Effect<boolean>);
		},
	}),
	contractProperty({
		name: "RemoveIdempotent",
		description: "remove on unknown key succeeds without error",
		port: "StorageTransport",
		arbitrary: fc.record({ key: fc.uuid() }),
		law: async ({ key }) => {
			return Effect.runPromise(Effect.gen(function*() {
				const t = yield* createTransport();
				yield* t.remove(key);
				return true === true;
			}).pipe(Effect.orDie) as Effect.Effect<boolean>);
		},
	}),
	contractProperty({
		name: "GetAllContainsPut",
		description: "getAll contains value after put",
		port: "StorageTransport",
		arbitrary: fc.record({ key: fc.uuid(), value: fc.uuid() }),
		law: async ({ key, value }) => {
			return Effect.runPromise(Effect.gen(function*() {
				const t = yield* createTransport();
				yield* t.put(key, value);
				return (yield* t.getAll()).items.includes(value);
			}).pipe(Effect.orDie) as Effect.Effect<boolean>);
		},
	}),
	contractProperty({
		name: "PutGetAllCount",
		description: "getAll length increases after put with distinct keys",
		port: "StorageTransport",
		arbitrary: fc.record({ k1: fc.uuid(), v1: fc.uuid(), k2: fc.uuid(), v2: fc.uuid() }),
		law: async ({ k1, v1, k2, v2 }) => {
			return Effect.runPromise(Effect.gen(function*() {
				const t = yield* createTransport();
				yield* t.put(k1, v1);
				yield* t.put(k2, v2);
				return (yield* t.getAll()).items.length >= 2;
			}).pipe(Effect.orDie) as Effect.Effect<boolean>);
		},
	}),
];
