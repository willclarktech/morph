// Handler implementation for getPost

import { Effect, Layer } from "effect";

import { PostNotFoundError } from "@blog-app/blog-dsl";
import { PostRepository } from "../../services";
import { GetPostHandler } from "./handler";

export const GetPostHandlerLive = Layer.effect(
	GetPostHandler,
	Effect.gen(function* () {
		const postRepo = yield* PostRepository;

		return {
			handle: (params) =>
				Effect.gen(function* () {
					const post = yield* postRepo
						.findById(params.postId)
						.pipe(
							Effect.mapError(
								(e) => new PostNotFoundError({ message: e.message }),
							),
						);
					if (!post) {
						return yield* Effect.fail(
							new PostNotFoundError({
								message: `Post ${params.postId} not found`,
							}),
						);
					}

					return post;
				}),
		};
	}),
);
