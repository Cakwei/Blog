import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { Session } from "better-auth";
import { Suspense } from "react";
import { Skeleton } from "#/components/ui/skeleton";
import { prisma } from "#/db";

const getRandomPosts = createServerFn().handler(async () => {
	const posts = await prisma.post.findMany({
		take: 10,
		select: {
			id: true,
			category: true,
			content: true,
			date: true,
			excerpt: true,
			image: true,
			title: true,
			userId: true,
			user: {
				select: {
					displayUsername: true,
				},
			},
		},
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
		/* Midnight Canvas Background */
		<div className=" min-h-screen text-(--text)">
			<div className="max-w-6xl mx-auto px-4 py-12">
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
			<div className="text-center py-20 border border-dashed min-h-[65dvh] border-(--border) bg-(--bg-secondary) flex justify-center flex-col items-center rounded-2xl">
				<h3 className="text-lg font-bold text-(--text) mb-2">
					No posts available
				</h3>
				<p className="text-(--text-secondary) text-sm">
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
						{/* Featured Image Container */}
						<div className="overflow-hidden rounded-2xl bg-(--bg-secondary) border border-(--border)">
							{featuredPost.image && (
								<img
									src={featuredPost.image}
									alt={featuredPost.title}
									className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300"
								/>
							)}
						</div>
						<div>
							{/* Accent Kicker */}
							<span className="text-(--link) font-extrabold uppercase tracking-wider text-sm">
								Featured Post
							</span>

							{/* Featured Title */}
							<h1 className="text-4xl font-bold mt-2 mb-4 text-(--text) group-hover:text-(--link) transition-colors">
								{featuredPost.title}
							</h1>

							{/* Featured Excerpt */}
							<p className="text-(--text-secondary) text-lg mb-4 line-clamp-3">
								{featuredPost.excerpt}
							</p>

							{/* Meta & Category Badge */}
							<div className="flex items-center text-sm text-(--text-secondary)">
								<div className="flex items-center gap-1.5">
									<span>{new Date(featuredPost.date).toDateString()}</span>
									<span>|</span>
									<span>{`Authored by ${featuredPost.user.displayUsername}`}</span>
								</div>
								<span className="mx-2">•</span>
								<span className="rounded-full border border-(--border) bg-(--bg-secondary) px-3.5 py-1 text-xs font-semibold text-(--link) capitalize">
									{featuredPost.category || "General"}
								</span>
							</div>
						</div>
					</Link>
					<hr className="my-10 text-(--border)" />
				</section>
			)}

			{/* Grid Section Header */}
			<div className="flex justify-between items-end mb-8">
				<h2 className="text-2xl font-extrabold text-(--text)">
					Latest Articles
				</h2>
				<Link
					to="/"
					className="text-(--link) hover:underline text-sm font-semibold"
				>
					View all
				</Link>
			</div>

			{/* Grid Section */}
			<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
				{remainingPosts.map((post) => (
					<article key={post.id} className="group">
						<Link to="/posts/$postId" params={{ postId: post.id.toString() }}>
							<div className="overflow-hidden rounded-xl mb-4 bg-(--bg-secondary) border border-(--border)">
								{post.image && (
									<img
										src={post.image}
										alt={post.title}
										className="w-full aspect-[16/10] object-cover group-hover:scale-105 transition-transform duration-300"
									/>
								)}
							</div>

							<div className="flex gap-2 overflow-x-auto scrollbar-none truncate mb-2">
								{post.category ? (
									post.category.split(",").map((cat) => (
										<span
											key={cat}
											className="rounded-full border border-(--border) bg-(--bg-secondary) px-3 py-0.5 text-xs font-semibold text-(--link) capitalize"
										>
											{cat.trim()}
										</span>
									))
								) : (
									<span className="rounded-full border border-(--border) bg-(--bg-secondary) px-3 py-0.5 text-xs font-semibold text-(--text-secondary) capitalize">
										General
									</span>
								)}
							</div>

							<h3 className="text-xl font-bold mt-2 mb-2 text-(--text) group-hover:text-(--link) transition-colors">
								{post.title}
							</h3>
							<p className="text-(--text-secondary) line-clamp-2 mb-4 text-sm">
								{post.excerpt}
							</p>

							<div className="flex items-center gap-1.5 text-xs text-(--text-secondary)">
								<span>{new Date(post.date).toDateString()}</span>
								<span>|</span>
								<span>{`By ${post.user?.displayUsername || "Anonymous"}`}</span>
							</div>
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
				<Skeleton className="w-full aspect-video rounded-2xl bg-(--bg-secondary)" />
				<div className="space-y-4">
					<Skeleton className="h-4 w-28 bg-(--bg-secondary)" />
					<Skeleton className="h-10 w-4/5 bg-(--bg-secondary)" />
					<div className="space-y-2">
						<Skeleton className="h-5 w-full bg-(--bg-secondary)" />
						<Skeleton className="h-5 w-3/4 bg-(--bg-secondary)" />
					</div>
					<div className="flex items-center gap-3 pt-2">
						<Skeleton className="h-4 w-24 bg-(--bg-secondary)" />
						<Skeleton className="h-6 w-20 rounded-full bg-(--bg-secondary)" />
					</div>
				</div>
			</div>
			<hr className="my-10 border-(--border)" />
		</section>
	);
}

function ArticleCardSkeleton() {
	return (
		<div className="space-y-3 animate-pulse">
			<Skeleton className="w-full aspect-[16/10] rounded-xl bg-(--bg-secondary)" />
			<Skeleton className="h-6 w-20 rounded-full bg-(--bg-secondary)" />
			<Skeleton className="h-6 w-5/6 bg-(--bg-secondary)" />
			<div className="space-y-2">
				<Skeleton className="h-4 w-full bg-(--bg-secondary)" />
				<Skeleton className="h-4 w-2/3 bg-(--bg-secondary)" />
			</div>
			<Skeleton className="h-4 w-24 bg-(--bg-secondary)" />
		</div>
	);
}

function HomeSkeleton({ gridCount = 6 }: { gridCount?: number }) {
	return (
		<div>
			<FeaturedPostSkeleton />
			<div className="flex justify-between items-end mb-8">
				<Skeleton className="h-8 w-44 bg-(--bg-secondary)" />
				<Skeleton className="h-4 w-16 bg-(--bg-secondary)" />
			</div>
			<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
				{Array.from({ length: gridCount }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: No-fix atm
					<ArticleCardSkeleton key={i} />
				))}
			</div>
		</div>
	);
}
