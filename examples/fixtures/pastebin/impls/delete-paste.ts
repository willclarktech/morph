// Handler implementation for deletePaste

import { Effect, Layer } from "effect";

import { PasteNotFoundError } from "@pastebin/pastes-dsl";
import { PasteRepository } from "../../services";
import { DeletePasteHandler } from "./handler";

export const DeletePasteHandlerLive = Layer.effect(
	DeletePasteHandler,
	Effect.gen(function* () {
		const repo = yield* PasteRepository;

		return {
			handle: (params, _options) =>
				Effect.gen(function* () {
					const paste = yield* repo.findById(params.pasteId).pipe(Effect.mapError((error) => new PasteNotFoundError({ message: error.message })));
					if (!paste) {
						return yield* Effect.fail(
							new PasteNotFoundError({
								message: `Paste not found: ${params.pasteId}`,
							}),
						);
					}
					yield* repo.delete(params.pasteId).pipe(Effect.mapError((error) => new PasteNotFoundError({ message: error.message })));
					return true;
				}),
		};
	}),
);
