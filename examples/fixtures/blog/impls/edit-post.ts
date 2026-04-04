// Handler implementation for editPost

import { Effect, Layer } from "effect";

import { PostNotFoundError } from "@blog/blog-dsl";
import { PostRepository } from "../../services";
import { EditPostHandler } from "./handler";

export const EditPostHandlerLive = Layer.effect(
	EditPostHandler,
	Effect.gen(function* () {
		const postRepo = yield* PostRepository;

		return {
			handle: (params, options) =>
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

					const updated = {
						...post,
						...(options.title === undefined ? {} : { title: options.title }),
						...(options.content === undefined
							? {}
							: { content: options.content }),
					};

					yield* postRepo
						.save(updated)
						.pipe(
							Effect.mapError(
								(error) => new PostNotFoundError({ message: error.message }),
							),
						);
					return updated;
				}),
		};
	}),
);
