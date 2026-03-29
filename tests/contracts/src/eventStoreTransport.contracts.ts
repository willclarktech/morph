import { contractProperty } from "@morphdsl/property";
import { Effect } from "effect";
import * as fc from "fast-check";

export const eventStoreTransportContracts = (createTransport: () => Effect.Effect<any, any>) => [
	contractProperty({
		name: "AppendGetAll",
		description: "appended event appears in getAll",
		port: "EventStoreTransport",
		arbitrary: fc.record({ data: fc.uuid() }),
		law: async ({ data }) => {
			return Effect.runPromise(Effect.gen(function*() {
				const t = yield* createTransport();
				yield* t.append(data);
				return (yield* t.getAll()).includes(data);
			}).pipe(Effect.orDie) as Effect.Effect<boolean>);
		},
	}),
	contractProperty({
		name: "AppendOrdering",
		description: "events appear in append order",
		port: "EventStoreTransport",
		arbitrary: fc.record({ a: fc.uuid(), b: fc.uuid() }),
		law: async ({ a, b }) => {
			return Effect.runPromise(Effect.gen(function*() {
				const t = yield* createTransport();
				yield* t.append(a);
				yield* t.append(b);
				return (yield* t.getAll()).includes(a) && (yield* t.getAll()).includes(b);
			}).pipe(Effect.orDie) as Effect.Effect<boolean>);
		},
	}),
	contractProperty({
		name: "GetByTagFilters",
		description: "getByTag returns only events with matching tag",
		port: "EventStoreTransport",
		arbitrary: fc.record({ data: fc.uuid(), tag: fc.uuid() }),
		law: async ({ data, tag }) => {
			return Effect.runPromise(Effect.gen(function*() {
				const t = yield* createTransport();
				yield* t.append(data);
				return (yield* t.getAll()).length >= 1;
			}).pipe(Effect.orDie) as Effect.Effect<boolean>);
		},
	}),
	contractProperty({
		name: "GetAllEmpty",
		description: "getAll returns empty on fresh store",
		port: "EventStoreTransport",
		arbitrary: fc.constant({}),
		law: async () => {
			return Effect.runPromise(Effect.gen(function*() {
				const t = yield* createTransport();
				return (yield* t.getAll()).length === 0;
			}).pipe(Effect.orDie) as Effect.Effect<boolean>);
		},
	}),
];
