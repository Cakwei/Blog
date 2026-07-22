import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { Session } from "better-auth";
import { Suspense } from "react";
import { Skeleton } from "#/components/ui/skeleton";
import { prisma } from "#/db";

const getRandomPosts = createServerFn().handler(async () => {
	// This runs only on the server
	const posts = await prisma.post.findMany({
		take: 10,
	});

	return posts;
});

const postsQueryOptions = (userId: string) =>
	queryOptions({
		queryKey: ["posts", userId],
		queryFn: () => getRandomPosts(),
		refetchInterval: 1000 * 60,
	});

export const Route = createFileRoute("/")({
	beforeLoad: async ({ context }) => {
		const userId = context.session ? (context.session as Session).id : "";
		context.queryClient.fetchQuery(postsQueryOptions(userId));
	},
	component: HomePage,
});

function HomePage() {
	return (
		<div className="bg-black">
			<div className="max-w-6xl mx-auto px-4 py-12 bg-black">
				<Suspense fallback={<HomeSkeleton />}>
					<HomeContent />
				</Suspense>
			</div>
		</div>
	);
}

function HomeContent() {
	const context = Route.useRouteContext();
	const userId = context.session ? (context.session as Session).id : "";

	const { data: posts } = useSuspenseQuery(postsQueryOptions(userId));

	const featuredPost = posts[0];
	const remainingPosts = posts.slice(1);

	if (posts.length === 0) {
		return (
			<div className="text-center py-20 border border-dashed min-h-[65dvh] border-neutral-500 flex justify-center flex-col items-center rounded-2xl">
				<h3 className="text-lg font-bold text-white mb-2">
					No posts available
				</h3>
				<p className="text-neutral-300 text-sm">
					Check back later for fresh content.
				</p>
			</div>
		);
	}

	return (
		<>
			{/* Hero Section */}
			{featuredPost && (
				<section>
					<Link
						to="/posts/$postId"
						params={{ postId: featuredPost.id.toString() }}
						className="group grid md:grid-cols-2 gap-8 items-center"
					>
						<div className="overflow-hidden rounded-2xl bg-neutral-900">
							{featuredPost.image && (
								<img
									src={featuredPost.image}
									alt={featuredPost.title}
									className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300"
								/>
							)}
						</div>
						<div>
							<span className="text-white font-extrabold uppercase tracking-wider text-sm">
								Featured Post
							</span>
							<h1 className="text-4xl font-bold mt-2 mb-4 group-hover:underline underline-offset-8 text-white transition-colors">
								{featuredPost.title}
							</h1>
							<p className="text-neutral-300 text-lg mb-4">
								{featuredPost.excerpt}
							</p>
							<div className="flex items-center text-sm text-neutral-400">
								<span>{new Date(featuredPost.date).toDateString()}</span>
								<span className="mx-2">•</span>
								<span className="rounded-full border border-neutral-700 px-3.5 py-1 text-xs font-bold text-white capitalize">
									{featuredPost.category || "Category not set"}
								</span>
							</div>
						</div>
					</Link>
					<hr className="my-10 border-neutral-700" />
				</section>
			)}

			{/* Grid Section Header */}
			<div className="flex justify-between items-end mb-8">
				<h2 className="text-2xl text-white font-extrabold">Latest Articles</h2>
				<Link to="/" className="text-white hover:underline">
					<span className="text-white hover:underline">View all</span>
				</Link>
			</div>

			{/* Grid Section */}
			<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
				{remainingPosts.map((post) => (
					<article key={post.id} className="group">
						<Link to="/posts/$postId" params={{ postId: post.id.toString() }}>
							<div className="overflow-hidden rounded-xl mb-4 bg-neutral-900">
								{post.image && (
									<img
										src={post.image}
										alt={post.title}
										className="w-full aspect-[16/10] object-cover group-hover:scale-105 transition-transform duration-300"
									/>
								)}
							</div>
							<div className="flex gap-2.5 overflow-x-auto scrollbar-none truncate mb-2">
								{post.category ? (
									post.category.split(",").map((cat) => (
										<span
											key={cat}
											className="rounded-full border border-neutral-700 px-3.5 py-1 text-xs font-bold text-white capitalize"
										>
											{cat.trim()}
										</span>
									))
								) : (
									<span className="rounded-full border border-neutral-700 px-3.5 py-1 text-xs font-bold text-white capitalize">
										No category
									</span>
								)}
							</div>

							<h3 className="text-xl font-bold mt-2 mb-2 group-hover:underline underline-offset-4 text-white transition-colors">
								{post.title}
							</h3>
							<p className="text-neutral-300 line-clamp-2 mb-4">
								{post.excerpt}
							</p>
							<p className="text-sm text-neutral-400">
								{new Date(post.date).toDateString()}
							</p>
						</Link>
					</article>
				))}
			</div>
		</>
	);
}

/* -------------------------------------------------------------------------- */
/*                               Skeleton UI                                  */
/* -------------------------------------------------------------------------- */

function FeaturedPostSkeleton() {
	return (
		<section className="animate-pulse">
			<div className="grid md:grid-cols-2 gap-8 items-center">
				{/* Hero Image Skeleton */}
				<Skeleton className="w-full aspect-video rounded-2xl bg-neutral-800" />

				{/* Hero Details Skeleton */}
				<div className="space-y-4">
					<Skeleton className="h-4 w-28 bg-neutral-800" />
					<Skeleton className="h-10 w-4/5 bg-neutral-800" />
					<div className="space-y-2">
						<Skeleton className="h-5 w-full bg-neutral-800" />
						<Skeleton className="h-5 w-3/4 bg-neutral-800" />
					</div>
					<div className="flex items-center gap-3 pt-2">
						<Skeleton className="h-4 w-24 bg-neutral-800" />
						<Skeleton className="h-6 w-20 rounded-full bg-neutral-800" />
					</div>
				</div>
			</div>
			<hr className="my-10 border-neutral-700" />
		</section>
	);
}

function ArticleCardSkeleton() {
	return (
		<div className="space-y-3 animate-pulse">
			{/* Card Image Skeleton */}
			<Skeleton className="w-full aspect-[16/10] rounded-xl bg-neutral-800" />

			{/* Category Tag Skeleton */}
			<Skeleton className="h-6 w-20 rounded-full bg-neutral-800" />

			{/* Title Skeleton */}
			<Skeleton className="h-6 w-5/6 bg-neutral-800" />

			{/* Excerpt Skeleton */}
			<div className="space-y-2">
				<Skeleton className="h-4 w-full bg-neutral-800" />
				<Skeleton className="h-4 w-2/3 bg-neutral-800" />
			</div>

			{/* Date Skeleton */}
			<Skeleton className="h-4 w-24 bg-neutral-800" />
		</div>
	);
}

function HomeSkeleton({ gridCount = 6 }: { gridCount?: number }) {
	return (
		<div>
			{/* Hero Skeleton */}
			<FeaturedPostSkeleton />

			{/* Header Section Skeleton */}
			<div className="flex justify-between items-end mb-8">
				<Skeleton className="h-8 w-44 bg-neutral-800" />
				<Skeleton className="h-4 w-16 bg-neutral-800" />
			</div>

			{/* Grid Section Skeleton */}
			<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
				{Array.from({ length: gridCount }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: No-fix atm
					<ArticleCardSkeleton key={i} />
				))}
			</div>
		</div>
	);
}
