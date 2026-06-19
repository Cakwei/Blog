import { createServerFn } from "@tanstack/react-start";
import { MOCK_POSTS } from "#/lib/const";

export const getPosts = createServerFn({ method: "GET" }).handler(async () => {
	return MOCK_POSTS;
});

export const getPostById = createServerFn({ method: "GET" })
	// 1. Define what input the function expects
	.validator((postId: string) => postId)
	// 2. Destructure 'data' (which is the postId) from the context object
	.handler(async ({ data: postId }) => {
		const post = MOCK_POSTS.find((p) => p.id === postId);
		if (!post) {
			throw new Error("Post not found");
		}
		return post;
	});
