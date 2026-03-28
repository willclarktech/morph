// Handler implementation for unpublishPost

import { Effect, Layer } from "effect";

import { NotPublishedError, PostNotFoundError } from "@blog-app/blog-dsl";
import { PostRepository } from "../../services";
import { UnpublishPostHandler } from "./handler";

export const UnpublishPostHandlerLive = Layer.effect(
	UnpublishPostHandler,
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

					if (post.status === "draft") {
						return yield* Effect.fail(
							new NotPublishedError({
								message: `Post ${params.postId} is not published`,
							}),
						);
					}

					const unpublished = {
						...post,
						publishedAt: undefined,
						status: "draft" as const,
					};

					yield* postRepo
						.save(unpublished)
						.pipe(
							Effect.mapError(
								(error) => new PostNotFoundError({ message: error.message }),
							),
						);
					return unpublished;
				}),
		};
	}),
);
