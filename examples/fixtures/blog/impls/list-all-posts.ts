// Handler implementation for listAllPosts

import { Effect, Layer } from "effect";

import { PostRepository } from "../../services";
import { ListAllPostsHandler } from "./handler";

export const ListAllPostsHandlerLive = Layer.effect(
	ListAllPostsHandler,
	Effect.gen(function* () {
		const postRepo = yield* PostRepository;

		return {
			handle: () =>
				Effect.gen(function* () {
					const result = yield* postRepo.findAll().pipe(Effect.orDie);
					return [...result.items];
				}),
		};
	}),
);
