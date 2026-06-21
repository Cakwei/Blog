import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { prisma } from "#/db";
import type { Post } from "#/lib/types";
import { getFreshServerSession } from "#/lib/utils";

const getOwnPosts = createServerFn().handler(async () => {
	// This runs only on the server
	const session = await getFreshServerSession();
	const posts = await prisma.post.findMany({
		where: {
			userId: session?.user.id,
		},
	});

	return posts;
});

const postsQueryOptions = () =>
	queryOptions({
		queryKey: ["posts"],
		queryFn: () => getOwnPosts(),
	});

export const Route = createFileRoute("/posts/")({
	loader: async ({ context }) => {
		context.queryClient.ensureQueryData(postsQueryOptions());
	},
	component: AdminPostsPage,
});

function AdminPostsPage() {
	const {
		data: posts,
		isSuccess,
		isLoading,
	} = useSuspenseQuery(postsQueryOptions());
	const navigate = useNavigate();
	return (
		<div className="max-w-6xl mx-auto px-4 py-12">
			<div className="flex justify-between items-end mb-10">
				<div>
					<h1 className="text-3xl font-bold">Your posts</h1>
					<p className="text-gray-500 mt-1">
						Create, edit, and publish your articles.
					</p>
				</div>
				<Button
					onClick={() => navigate({ to: "/posts/create" })}
					className="px-5 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
				>
					New post
				</Button>
			</div>

			{!isLoading && isSuccess && posts.length !== 0 && (
				<div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100">
					{posts.map((post) => (
						<PostRow key={post.id} post={post} />
					))}
				</div>
			)}

			{isLoading && (
				<div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100">
					<Skeleton className="w-full h-[50vw]" />
					dd
				</div>
			)}

			{!isLoading && isSuccess && posts.length === 0 && <EmptyState />}
		</div>
	);
}

function PostRow({ post }: { post: Post }) {
	const isDraft = post.status === "draft";

	return (
		<div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
			<div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
				{post.image && (
					<img src={post.image} alt="" className="w-full h-full object-cover" />
				)}
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 mb-1">
					<span
						className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
							isDraft
								? "bg-amber-50 text-amber-700"
								: "bg-green-50 text-green-700"
						}`}
					>
						{isDraft ? "Draft" : "Published"}
					</span>
					<span className="text-xs font-bold text-blue-500 uppercase">
						{post.category}
					</span>
				</div>
				<h3 className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
					{post.title}
				</h3>
				<p className="text-sm text-gray-400">
					{new Date(post.date).toLocaleDateString("en-MY")}
				</p>
			</div>

			<div className="flex items-center gap-2 flex-shrink-0">
				<Link
					to="/posts/$postId"
					params={{ postId: post.id }}
					className="px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
				>
					View
				</Link>
				<Link
					to="/"
					//to="/posts/$postId/edit"
					params={{ postId: post.id }}
					className="px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
				>
					Edit
				</Link>
			</div>
		</div>
	);
}

function EmptyState() {
	return (
		<div className="text-center py-20 border border-dashed border-gray-200 rounded-2xl">
			<h3 className="text-lg font-bold text-gray-900 mb-2">No posts yet</h3>
			<p className="text-gray-500 mb-6 text-sm">
				Write your first post to see it here.
			</p>
		</div>
	);
}
