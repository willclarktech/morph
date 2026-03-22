// Handler implementation for listContacts

import { Effect, Layer } from "effect";

import { ContactRepository } from "../../services";

import { ListContactsHandler } from "./handler";

export const ListContactsHandlerLive = Layer.effect(
	ListContactsHandler,
	Effect.gen(function* () {
		const repo = yield* ContactRepository;

		return {
			handle: (_params, _options) =>
				Effect.gen(function* () {
					const result = yield* repo.findAll().pipe(Effect.orDie);
					return [...result.items];
				}),
		};
	}),
);
