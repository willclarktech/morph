// Handler implementation for listPublishedPosts

import { Effect, Layer } from "effect";

import { PostRepository } from "../../services";
import { ListPublishedPostsHandler } from "./handler";

export const ListPublishedPostsHandlerLive = Layer.effect(
	ListPublishedPostsHandler,
	Effect.gen(function* () {
		const postRepo = yield* PostRepository;

		return {
			handle: () =>
				Effect.gen(function* () {
					const result = yield* postRepo.findAll().pipe(Effect.orDie);
					return [...result.items.filter((post) => post.status === "published")];
				}),
		};
	}),
);
