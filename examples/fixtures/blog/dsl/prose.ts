/**
 * Prose templates for blog operations.
 *
 * This file is a FIXTURE - hand-written, survives regeneration.
 */
import type { Prose } from "@morphdsl/operation";

import type * as ops from "./blog";

export const prose: Prose<typeof ops> = {
	createUser:
		'{actor} creates a user with name "{name}" and email "{email}" as {role}',
	createPost: '{actor} creates a post "{title}"',
	editPost: '{actor} edits the post "{$post.title}"',
	deletePost: '{actor} deletes the post "{$post.title}"',
	publishPost: '{actor} publishes the post "{$post.title}"',
	unpublishPost: '{actor} unpublishes the post "{$post.title}"',
	setUserRole: "{actor} sets user role to {role}",
	getPost: '{actor} gets the post "{$post.title}"',
	listAllPosts: "{actor} lists all posts",
	listPublishedPosts: "{actor} lists published posts",
};
