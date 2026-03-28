// Handler implementation for createPost

import { Effect, Layer } from "effect";

import { postId, UserNotFoundError } from "@blog-app/blog-dsl";
import { IdGenerator, PostRepository, UserRepository } from "../../services";
import { CreatePostHandler } from "./handler";

export const CreatePostHandlerLive = Layer.effect(
	CreatePostHandler,
	Effect.gen(function* () {
		const idGen = yield* IdGenerator;
		const postRepo = yield* PostRepository;
		const userRepo = yield* UserRepository;

		return {
			handle: (params) =>
				Effect.gen(function* () {
					const author = yield* userRepo
						.findById(params.authorId)
						.pipe(
							Effect.mapError(
								(error) => new UserNotFoundError({ message: error.message }),
							),
						);
					if (!author) {
						return yield* Effect.fail(
							new UserNotFoundError({
								message: `User ${params.authorId} not found`,
							}),
						);
					}

					const id = yield* idGen.generate();
					const post = {
						id: postId(id),
						authorId: params.authorId,
						content: params.content,
						status: "draft" as const,
						title: params.title,
					};

					yield* postRepo
						.save(post)
						.pipe(
							Effect.mapError(
								(error) => new UserNotFoundError({ message: error.message }),
							),
						);
					return post;
				}),
		};
	}),
);
