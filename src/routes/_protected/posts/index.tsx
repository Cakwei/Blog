import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { Session } from "better-auth";
import { Suspense } from "react";
import { Button } from "#/components/ui/button";
import { prisma } from "#/db";
import type { Post } from "#/lib/types";
import { getSessionFn } from "#/lib/utils";
import "#/index.css";

const getOwnPosts = createServerFn().handler(async () => {
	// This runs only on the server
	const session = await getSessionFn();
	const posts = await prisma.post.findMany({
		where: {
			userId: session?.user.id,
		},
	});
	return posts;
});

const postsQueryOptions = (userId: string) =>
	queryOptions({
		queryKey: ["myPosts", userId],
		queryFn: () => getOwnPosts(),
	});

export const Route = createFileRoute("/_protected/posts/")({
	beforeLoad: async ({ context }) => {
		const userId = (context.session as Session).id;
		context.queryClient.fetchQuery(postsQueryOptions(userId));
	},
	component: AdminPostsPage,
});

function AdminPostsPage() {
	const navigate = useNavigate();

	return (
		<div className="max-w-6xl bg-(--bg) mx-auto px-4 py-12">
			<div className="flex justify-between items-end mb-10">
				<div>
					<h1 className="text-3xl text-(--text) font-extrabold">Your posts</h1>
					<p className="text-(--text-secondary) mt-1">
						Create, edit, and publish your articles.
					</p>
				</div>
				<Button
					onClick={() => navigate({ to: "/posts/create" })}
					className="px-5 bg-(--link) hover:bg-(--link)/80 text-(--text) font-semibold transition-colors whitespace-nowrap shadow-sm border border-(--border)"
				>
					New post
				</Button>
			</div>

			{/* Skeleton UI mimicking real post rows during loading */}
			<Suspense fallback={<PostListSkeleton count={5} />}>
				<PostListContent />
			</Suspense>
		</div>
	);
}

// Extracted the query logic into a separate component so Suspense can catch the loading promise
function PostListContent() {
	const { session }: { session: Session } = Route.useRouteContext();
	const userId = session.userId;
	const { data: posts } = useSuspenseQuery(postsQueryOptions(userId));

	if (posts.length === 0) {
		return <EmptyState />;
	}

	return (
		<div className="rounded-2xl overflow-hidden divide-y divide-(--border) bg-(--bg-secondary) border border-(--border) shadow-xl">
			{posts.map((post) => (
				<PostRow key={post.id} post={post} />
			))}
		</div>
	);
}

function PostRow({ post }: { post: Post }) {
	const isDraft = post.status === "draft";

	return (
		<div className="flex items-center gap-4 px-5 py-4 hover:bg-(--bg) transition-colors group">
			<div className="w-16 h-16 rounded-lg overflow-hidden bg-(--bg) border border-(--border) flex-shrink-0">
				{post.image && (
					<img src={post.image} alt="" className="w-full h-full object-cover" />
				)}
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 mb-1">
					<span
						className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
							isDraft
								? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
								: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
						}`}
					>
						{isDraft ? "Draft" : "Published"}
					</span>
					<span className="text-xs font-bold text-(--text) flex gap-1.5">
						{post.category ? (
							post.category.split(",").map((cat) => (
								<span
									key={cat}
									className="rounded-full border border-(--border) px-2.5 py-0.5 text-xs font-semibold bg-(--bg) text-(--link) capitalize"
								>
									{capitalize(cat)}
								</span>
							))
						) : (
							<span className="rounded-full border border-(--border) px-2.5 py-0.5 text-xs font-semibold bg-(--bg) text-(--text-secondary) capitalize">
								No tags
							</span>
						)}
					</span>
				</div>
				<h3 className="font-bold text-(--text) truncate group-hover:text-(--link) transition-colors">
					{post.title}
				</h3>
				<p className="text-sm text-(--text-secondary)">
					{new Date(post.date).toLocaleDateString("en-MY")}
				</p>
			</div>

			<div className="flex items-center gap-2 flex-shrink-0">
				<Link
					to="/posts/$postId"
					params={{ postId: post.id.toString() }}
					className="px-3 py-2 text-sm font-semibold rounded-lg transition-colors border border-transparent"
				>
					<span className="text-(--link) hover:underline ">View</span>
				</Link>
				<Link
					to="/posts/edit/$postId"
					params={{ postId: post.id.toString() }}
					className="px-3 py-2 text-sm font-semibold rounded-lg transition-colors"
				>
					<span className="text-(--text-secondary) hover:underline ">Edit</span>
				</Link>
			</div>
		</div>
	);
}

function PostRowSkeleton() {
	return (
		<div className="flex items-center gap-4 px-5 py-4 animate-pulse">
			{/* Image Placeholder */}
			<div className="w-16 h-16 rounded-lg bg-(--bg) border border-(--border) flex-shrink-0" />

			{/* Content Placeholder */}
			<div className="flex-1 min-w-0 space-y-2">
				{/* Badges Placeholder */}
				<div className="flex items-center gap-2">
					<div className="h-4 w-16 bg-(--bg) border border-(--border) rounded-full" />
					<div className="h-4 w-14 bg-(--bg) border border-(--border) rounded-full" />
				</div>
				{/* Title Placeholder */}
				<div className="h-5 w-3/5 bg-(--bg) border border-(--border) rounded" />
				{/* Date Placeholder */}
				<div className="h-4 w-24 bg-(--bg) border border-(--border) rounded" />
			</div>

			{/* Action Buttons Placeholder */}
			<div className="flex items-center gap-4 flex-shrink-0">
				<div className="h-4 w-8 bg-(--bg) rounded" />
				<div className="h-4 w-8 bg-(--bg) rounded" />
			</div>
		</div>
	);
}

function PostListSkeleton({ count = 4 }: { count?: number }) {
	return (
		<div className="rounded-2xl overflow-hidden divide-y divide-(--border) bg-(--bg-secondary) border border-(--border)">
			{Array.from({ length: count }).map((_, index) => (
				<PostRowSkeleton
					key={
						// biome-ignore lint/suspicious/noArrayIndexKey: no
						index
					}
				/>
			))}
		</div>
	);
}

function EmptyState() {
	return (
		<div className="text-center py-20 border border-dashed min-h-[65dvh] border-(--border) bg-(--bg-secondary)/50 flex justify-center flex-col items-center rounded-2xl shadow-inner">
			<h3 className="text-lg font-bold text-(--text) mb-2">No posts yet</h3>
			<p className="text-(--text-secondary) mb-6 text-sm">
				Write your first post to see it here.
			</p>
		</div>
	);
}

function capitalize(string: string) {
	return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}
