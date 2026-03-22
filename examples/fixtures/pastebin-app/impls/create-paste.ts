// Handler implementation for createPaste

import { Effect, Layer } from "effect";

import type { Paste, PasteId } from "@pastebin-app/pastes-dsl";
import { IdGenerator, PasteRepository } from "../../services";

import { CreatePasteHandler } from "./handler";

export const CreatePasteHandlerLive = Layer.effect(
	CreatePasteHandler,
	Effect.gen(function* () {
		const idGen = yield* IdGenerator;
		const repo = yield* PasteRepository;

		return {
			handle: (params, options) =>
				Effect.gen(function* () {
					const id = (yield* idGen.generate()) as PasteId;
					const paste: Paste = {
						id,
						content: params.content,
						title: options.title ?? "",
						createdAt: new Date().toISOString(),
					};
					yield* repo.save(paste).pipe(Effect.orDie);
					return paste;
				}),
		};
	}),
);
