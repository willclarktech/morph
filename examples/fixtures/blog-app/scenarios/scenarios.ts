import type { Post, User } from "@blog-app/blog-dsl";

import { createPost, createUser, publishPost } from "@blog-app/blog-dsl";
import { assert, given, ref, scenario, then, when } from "@morphdsl/scenario";

export const scenarios = [
	scenario("Admin publishes a post")
		.withActor("Admin Alice")
		.steps(
			given(
				createUser.call({
					email: "alice@test.com",
					name: "Alice",
					password: "password123",
					role: "admin",
				}),
			).as("admin"),
			when(
				createPost.call({
					authorId: ref<User>("admin").id,
					content: "Hello world",
					title: "First Post",
				}),
			).as("post"),
			when(publishPost.call({ postId: ref<Post>("post").id })).as(
				"publishedPost",
			),
			then(
				assert("publishedPost", "status")
					.toBe("published")
					.withProse("the post is published"),
			),
		),

	scenario("Author creates a draft post")
		.withActor("Author Bob")
		.steps(
			given(
				createUser.call({
					email: "bob@test.com",
					name: "Bob",
					password: "password123",
					role: "author",
				}),
			).as("author"),
			when(
				createPost.call({
					authorId: ref<User>("author").id,
					content: "Draft content",
					title: "My Draft",
				}),
			).as("post"),
			then(
				assert("post", "status")
					.toBe("draft")
					.withProse("the post is a draft"),
			),
		),

	scenario("Admin creates multiple posts")
		.withActor("Admin Carol")
		.steps(
			given(
				createUser.call({
					email: "carol@test.com",
					name: "Carol",
					password: "password123",
					role: "admin",
				}),
			).as("admin"),
			when(
				createPost.call({
					authorId: ref<User>("admin").id,
					content: "First post content",
					title: "Post One",
				}),
			).as("post1"),
			when(
				createPost.call({
					authorId: ref<User>("admin").id,
					content: "Second post content",
					title: "Post Two",
				}),
			).as("post2"),
			then(
				assert("post1", "status")
					.toBe("draft")
					.withProse("the first post is a draft"),
			),
			then(
				assert("post2", "status")
					.toBe("draft")
					.withProse("the second post is a draft"),
			),
		),
];
