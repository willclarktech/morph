// Handler implementation for listPastes

import { Effect, Layer } from "effect";

import { PasteRepository } from "../../services";

import { ListPastesHandler } from "./handler";

export const ListPastesHandlerLive = Layer.effect(
	ListPastesHandler,
	Effect.gen(function* () {
		const repo = yield* PasteRepository;

		return {
			handle: (_params, _options) =>
				Effect.gen(function* () {
					const result = yield* repo.findAll().pipe(Effect.orDie);
					return [...result.items];
				}),
		};
	}),
);
