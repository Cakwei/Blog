/** biome-ignore-all lint/suspicious/noArrayIndexKey: Ignore*/
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
	ArrowUpRight,
} from "lucide-react";
import { Suspense } from "react";
import { Skeleton } from "#/components/ui/skeleton";
import { prisma } from "#/db";
import type { Category, Post, User } from "#/generated/prisma/client";
import type { IResponse } from "#/lib/types";

// Interfaces / Types
interface IPost extends Post {
	categories: Category[];
	user: User;
}
// ==================

// Server Function
export const getHomePosts = createServerFn({ method: "GET" }).handler(
	async () => {
		const posts = await prisma.post.findMany({
			where: { published: true },
			orderBy: { date: "desc" },
			include: {
				categories: true,
				user: true,
			},
		});

		return {
			success: true,
			data: posts,
			message: "Successfully fetched data",
		} as IResponse;
	},
);

// Query Options
const postsQueryOptions = queryOptions({
	queryKey: ["posts"],
	queryFn: () => getHomePosts(),
	staleTime: 60000,
	gcTime: 300000,
});
// ==================

export const Route = createFileRoute("/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(postsQueryOptions);
	},
	component: HomePage,
	pendingComponent: HomeSkeleton,
});

function HomePage() {
	return (
		<div className="min-h-screen text-(--text) bg-(--bg)">
			<div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
				<Suspense fallback={<HomeSkeleton />}>
					<HomeContent />
				</Suspense>
			</div>
		</div>
	);
}

function HomeContent() {
	const { data: posts } = useSuspenseQuery(postsQueryOptions);

	// Ensure postList is always an array
	const rawData = posts?.data;
	const postList: IPost[] = Array.isArray(rawData)
		? rawData
		: rawData &&
				typeof rawData === "object" &&
				"posts" in rawData &&
				Array.isArray(rawData.posts)
			? rawData.posts
			: [];

	const featuredPosts = postList.filter((post) => post.isFeatured);
	const activeFeaturedPosts =
		featuredPosts.length > 0 ? featuredPosts : postList.slice(0, 1);
	const remainingPosts = postList.filter(
		(post) => !activeFeaturedPosts.includes(post),
	);

	const currentFeatured = activeFeaturedPosts[0];

	return (
		<div className="max-w-3xl mx-auto space-y-12">
			{/* MINIMALIST HERO (Title + Clean Avatar Image) */}
			<section className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pt-4 pb-8 border-b border-(--border)">
				<div className="relative w-16 h-16 rounded-full overflow-hidden border border-(--border) bg-(--bg-secondary) flex-shrink-0 shadow-xs">
					<img
						src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80"
						alt="Charlee"
						className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-300"
					/>
				</div>

				<div className="space-y-1.5 flex-1 min-w-0">
					<h1
						data-testid="homeHeading"
						className="text-2xl sm:text-3xl font-bold tracking-tight text-(--text)"
					>
						Charlee's <span className="text-(--text)">Blog</span>: Curated Stories.
					</h1>
					<p className="text-(--text-secondary) text-sm leading-relaxed max-w-xl">
						Software engineer writing about web architecture, cloud systems, and design.
					</p>
				</div>
			</section>

			{/* FEATURED STORY OR ARCHIVE LINK */}
			{currentFeatured ? (
				<section className="space-y-3">
					<div className="flex items-center justify-between text-xs text-(--text-secondary)">
						<span className="font-semibold uppercase tracking-wider text-[11px] text-(--text-muted)">
							Featured Writing
						</span>
						<Link
							data-testid="exploreArchiveBtn"
							search={{ category: "ALL", search: "" }}
							to="/articles"
							className="hover:text-(--text) transition-colors flex items-center gap-1"
						>
							<span>Explore all articles</span>
							<ArrowUpRight className="w-3.5 h-3.5" />
						</Link>
					</div>

					<Link
						data-testid="postBtn"
						to="/posts/$postId"
						params={{ postId: currentFeatured.id.toString() }}
						className="group block p-5 rounded-lg border border-(--border) bg-(--bg-secondary)/60 hover:bg-(--bg-secondary) transition-all"
					>
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 text-xs text-(--text-secondary)">
							<span className="font-medium text-(--text-secondary)">
								{currentFeatured.categories && currentFeatured.categories.length > 0
									? currentFeatured.categories[0].name
									: "Article"}
							</span>
							<span>{new Date(currentFeatured.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
						</div>

						<h2 className="text-lg sm:text-xl font-semibold text-(--text) group-hover:underline underline-offset-4 transition-all">
							{currentFeatured.title}
						</h2>

						{currentFeatured.excerpt && (
							<p className="text-(--text-secondary) text-xs sm:text-sm line-clamp-2 mt-2 leading-relaxed">
								{currentFeatured.excerpt}
							</p>
						)}
					</Link>
				</section>
			) : (
				<section className="space-y-3">
					<div className="flex items-center justify-between text-xs text-(--text-secondary)">
						<span className="font-semibold uppercase tracking-wider text-[11px] text-(--text-muted)">
							Writing Archive
						</span>
						<Link
							data-testid="exploreArchiveBtn"
							search={{ category: "ALL", search: "" }}
							to="/articles"
							className="hover:text-(--text) transition-colors flex items-center gap-1"
						>
							<span>Explore all articles</span>
							<ArrowUpRight className="w-3.5 h-3.5" />
						</Link>
					</div>
				</section>
			)}

			{/* CLEAN TYPOGRAPHIC RECENT POSTS LIST */}
			<section className="space-y-4 pt-2">
				<div className="flex items-center justify-between border-b border-(--border) pb-2">
					<h3 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
						Recent Writing
					</h3>
					<Link
						to="/articles"
						className="text-xs text-(--text-secondary) hover:text-(--text) transition-colors"
					>
						View archive →
					</Link>
				</div>

				<div className="divide-y divide-(--border)">
					{Array.isArray(remainingPosts) && remainingPosts.length === 0 && (
						<p className="text-xs text-(--text-secondary) py-8 text-center">
							No additional posts found.
						</p>
					)}

					{Array.isArray(remainingPosts) &&
						remainingPosts.map((post: IPost) => (
							<article key={post.id} className="group py-3.5 first:pt-1 last:pb-1">
								<Link
									to="/posts/$postId"
									params={{ postId: post.id.toString() }}
									className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4"
								>
									<div className="flex items-baseline gap-3 min-w-0">
										<span className="text-xs text-(--text-muted) font-mono w-24 flex-shrink-0">
											{new Date(post.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
										</span>
										<h4 className="text-sm font-medium text-(--text) group-hover:underline underline-offset-4 truncate">
											{post.title}
										</h4>
									</div>

									<span className="text-[11px] text-(--text-muted) flex-shrink-0 sm:text-right">
										{post.categories && post.categories.length > 0
											? post.categories[0].name
											: "General"}
									</span>
								</Link>
							</article>
						))}
				</div>
			</section>
		</div>
	);
}

/* Skeleton UI */
function FeaturedPostSkeleton() {
	return (
		<div className="grid lg:grid-cols-12 gap-6 items-center bg-(--bg-secondary)/30 p-6 sm:p-8 rounded-2xl border border-(--border) animate-pulse">
			<Skeleton className="lg:col-span-7 aspect-[16/10] rounded-xl bg-(--bg-secondary)" />
			<div className="lg:col-span-5 space-y-4">
				<Skeleton className="h-4 w-28 bg-(--bg-secondary)" />
				<Skeleton className="h-8 w-full bg-(--bg-secondary)" />
				<Skeleton className="h-8 w-3/4 bg-(--bg-secondary)" />
				<div className="space-y-2">
					<Skeleton className="h-4 w-full bg-(--bg-secondary)" />
					<Skeleton className="h-4 w-2/3 bg-(--bg-secondary)" />
				</div>
				<Skeleton className="h-4 w-32 bg-(--bg-secondary)" />
			</div>
		</div>
	);
}

function ArticleRowSkeleton() {
	return (
		<div className="py-6 grid sm:grid-cols-12 gap-4 sm:gap-6 items-center animate-pulse">
			<div className="sm:col-span-8 space-y-2">
				<Skeleton className="h-3 w-32 bg-(--bg-secondary)" />
				<Skeleton className="h-6 w-full bg-(--bg-secondary)" />
				<Skeleton className="h-4 w-4/5 bg-(--bg-secondary)" />
			</div>
			<Skeleton className="sm:col-span-4 aspect-[16/10] rounded-lg bg-(--bg-secondary)" />
		</div>
	);
}

function HomeSkeleton({ gridCount = 4 }: { gridCount?: number }) {
	return (
		<div className="space-y-12">
			<header className="border-b border-(--border) pb-8 flex justify-between items-end">
				<div className="space-y-2">
					<Skeleton className="h-4 w-32 bg-(--bg-secondary)" />
					<Skeleton className="h-10 w-64 bg-(--bg-secondary)" />
				</div>
				<Skeleton className="h-4 w-28 bg-(--bg-secondary)" />
			</header>

			<FeaturedPostSkeleton />

			<div className="space-y-6 pt-4">
				<Skeleton className="h-3 w-32 bg-(--bg-secondary)" />
				<div className="divide-y divide-(--border)">
					{Array.from({ length: gridCount }).map((_, i) => (
						<ArticleRowSkeleton key={i} />
					))}
				</div>
			</div>
		</div>
	);
}
