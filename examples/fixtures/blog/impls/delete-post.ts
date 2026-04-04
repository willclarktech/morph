// Handler implementation for deletePost

import { Effect, Layer } from "effect";

import { PostNotFoundError } from "@blog/blog-dsl";
import { PostRepository } from "../../services";
import { DeletePostHandler } from "./handler";

export const DeletePostHandlerLive = Layer.effect(
	DeletePostHandler,
	Effect.gen(function* () {
		const postRepo = yield* PostRepository;

		return {
			handle: (params) =>
				Effect.gen(function* () {
					const post = yield* postRepo
						.findById(params.postId)
						.pipe(
							Effect.mapError(
								(error) => new PostNotFoundError({ message: error.message }),
							),
						);
					if (!post) {
						return yield* Effect.fail(
							new PostNotFoundError({
								message: `Post ${params.postId} not found`,
							}),
						);
					}

					yield* postRepo
						.delete(params.postId)
						.pipe(
							Effect.mapError(
								(error) => new PostNotFoundError({ message: error.message }),
							),
						);
					return true;
				}),
		};
	}),
);
