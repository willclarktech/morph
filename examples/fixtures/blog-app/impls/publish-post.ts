// Handler implementation for publishPost

import { Effect, Layer } from "effect";

import {
	AlreadyPublishedError,
	PostNotFoundError,
} from "@blog-app/blog-dsl";
import { PostRepository } from "../../services";
import { PublishPostHandler } from "./handler";

export const PublishPostHandlerLive = Layer.effect(
	PublishPostHandler,
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

					if (post.status === "published") {
						return yield* Effect.fail(
							new AlreadyPublishedError({
								message: `Post ${params.postId} is already published`,
							}),
						);
					}

					const published = {
						...post,
						publishedAt: new Date().toISOString(),
						status: "published" as const,
					};

					yield* postRepo
						.save(published)
						.pipe(
							Effect.mapError(
								(e) => new PostNotFoundError({ message: e.message }),
							),
						);
					return published;
				}),
		};
	}),
);
