import type { Post } from "./types";

export const MOCK_POSTS: Post[] = [
	{
		id: "1",
		title: "The Future of Full-stack React",
		excerpt:
			"Exploring why TanStack Start is changing the game for React developers...",
		date: "2024-05-20",
		category: "Engineering",
		image: "https://picsum.photos/seed/post1/800/450",
	},
	{
		id: "2",
		title: "Mastering Type-Safe Routing",
		excerpt: "How to leverage TypeScript to never write a broken link again.",
		date: "2024-05-18",
		category: "TypeScript",
		image: "https://picsum.photos/seed/post2/800/450",
	},
	{
		id: "3",
		title: "Server Functions Explained",
		excerpt: "Bridge the gap between your frontend and backend seamlessly.",
		date: "2024-05-15",
		category: "Backend",
		image: "https://picsum.photos/seed/post3/800/450",
	},
];
