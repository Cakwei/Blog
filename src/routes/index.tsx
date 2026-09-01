/** biome-ignore-all lint/suspicious/noArrayIndexKey: Ignore*/
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import axios from "axios";
import {
	ArrowLeft,
	ArrowRight,
	ArrowUpRight,
	Clock,
	Flame,
	Sparkles,
} from "lucide-react";
import { Suspense, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Label } from "#/components/ui/label";
import { Skeleton } from "#/components/ui/skeleton";
import type { Category, Post, User } from "#/generated/prisma/client";
import { API_URL } from "#/lib/const";
import type { IResponse } from "#/lib/types";
import { getHeadersCookieFn, logger } from "#/lib/utils";

// Interfaces / Types
interface IPost extends Post {
	categories: Category[];
	user: User;
}
// ==================

// Functions
async function getPosts() {
	const response = await axios.get(
		`${API_URL}/api/posts`,
		import.meta.env.SSR
			? { headers: { cookie: await getHeadersCookieFn() } }
			: {
					withCredentials: true,
				},
	);
	logger("debug", "oopppp", response.data);

	return response.data as IResponse;
}
// ==================

// Query Options
const postsQueryOptions = queryOptions({
	queryKey: ["posts"],
	queryFn: async () => await getPosts(),
	staleTime: 15000,
	gcTime: 15000,
	refetchInterval: 15000,
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

	const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);

	const handlePrevFeatured = () => {
		setCurrentFeaturedIndex((prev) =>
			prev === 0 ? activeFeaturedPosts.length - 1 : prev - 1,
		);
	};

	const handleNextFeatured = () => {
		setCurrentFeaturedIndex((prev) =>
			prev === activeFeaturedPosts.length - 1 ? 0 : prev + 1,
		);
	};

	const currentFeatured = activeFeaturedPosts[currentFeaturedIndex];

	if (postList.length === 0) {
		return (
			<div className="text-center py-20 border border-(--border) bg-(--bg-secondary)/20 flex justify-center flex-col items-center rounded-xl">
				<h3 className="text-base font-bold text-(--text) mb-1">
					No posts available
				</h3>
				<p className="text-(--text-secondary) text-xs">
					Check back later for fresh content.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-12">
			{/* Minimalist Editorial Header */}
			<header className="border-b border-(--border) pb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
				<div>
					<div className="flex items-center gap-2 text-xs font-semibold text-(--link) tracking-widest uppercase mb-2">
						<Sparkles className="w-3.5 h-3.5" /> Journal & Thoughts
					</div>
					<h1 className="text-4xl sm:text-5xl font-black tracking-tight text-(--text)">
						Curated Stories.
					</h1>
				</div>
				<Link
					search={{ category: "ALL", search: "" }}
					to="/articles"
					className="text-xs font-bold text-(--text-secondary) hover:text-(--link) transition-colors flex items-center gap-1 uppercase tracking-wider"
				>
					<span className="text-xs font-bold text-(--text-secondary) hover:text-(--link) transition-colors flex items-center gap-1 uppercase tracking-wider">
						Explore Archive <ArrowUpRight className="w-3.5 h-3.5" />
					</span>
				</Link>
			</header>

			{/* Featured Post - Sliding Editorial Magazine Style */}
			{currentFeatured && (
				<section className="space-y-4">
					<div className="relative">
						<Link
							data-testid="postBtn"
							to="/posts/$postId"
							params={{ postId: currentFeatured.id.toString() }}
							className="group grid lg:grid-cols-12 gap-6 items-center bg-(--bg-secondary)/30 p-6 sm:p-8 rounded-2xl border border-(--border) hover:border-(--link)/40 transition-all block"
						>
							<div className="lg:col-span-7 overflow-hidden rounded-xl bg-(--bg) aspect-[16/10] border border-(--border)">
								{currentFeatured.image && (
									<img
										src={currentFeatured.image}
										alt={currentFeatured.title}
										className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
									/>
								)}
							</div>
							<div className="lg:col-span-5 space-y-4">
								<div className="flex items-center gap-2">
									<Badge className="bg-(--link)/10 text-(--link) border-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5">
										<Flame className="w-3 h-3 mr-1 inline" /> Featured
									</Badge>
									<span className="text-xs text-(--text-secondary)">
										{new Date(currentFeatured.date).toLocaleDateString()}
									</span>
								</div>

								<h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-(--text) group-hover:text-(--link) transition-colors leading-tight">
									{currentFeatured.title}
								</h2>

								<p className="text-(--text-secondary) text-sm line-clamp-3 leading-relaxed">
									{currentFeatured.excerpt}
								</p>

								<div className="pt-2 text-xs font-medium text-(--text-secondary) flex items-center gap-2">
									<span>
										By{" "}
										<strong className="text-(--text)">
											{currentFeatured.user?.displayUsername ||
												currentFeatured.user?.name ||
												"Author"}
										</strong>
									</span>
								</div>
							</div>
						</Link>
					</div>

					{/* Carousel Navigation Controls using Shadcn Button */}
					{activeFeaturedPosts.length > 1 && (
						<div className="flex items-center justify-between px-2">
							<div className="flex items-center gap-1.5">
								{activeFeaturedPosts.map((_, index) => (
									<Button
										key={index}
										variant="ghost"
										size="icon"
										onClick={() => setCurrentFeaturedIndex(index)}
										className={`h-2 rounded-full p-0 transition-all ${
											currentFeaturedIndex === index
												? "w-6 bg-(--link) hover:bg-(--link)"
												: "w-2 bg-(--border) hover:bg-(--text-secondary)"
										}`}
										aria-label={`Go to slide ${index + 1}`}
									/>
								))}
							</div>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="icon"
									onClick={handlePrevFeatured}
									className="h-8 w-8 rounded-full border-(--border) bg-(--bg-secondary)/50 hover:bg-(--link)/10 hover:text-(--link)"
								>
									<ArrowLeft className="w-4 h-4" />
								</Button>
								<Button
									variant="outline"
									size="icon"
									onClick={handleNextFeatured}
									className="h-8 w-8 rounded-full border-(--border) bg-(--bg-secondary)/50 hover:bg-(--link)/10 hover:text-(--link)"
								>
									<ArrowRight className="w-4 h-4" />
								</Button>
							</div>
						</div>
					)}
				</section>
			)}

			{/* Clean Feed List Layout */}
			<div className="space-y-6 pt-4">
				<h3 className="text-xs font-bold uppercase tracking-widest text-(--text-secondary) border-b border-(--border) pb-3">
					Latest Releases
				</h3>

				<div className="divide-y divide-(--border)">
					{Array.isArray(remainingPosts) && remainingPosts.length <= 0 && (
						<Card className="px-2.5 bg-(--bg-secondary) rounded-md flex justify-center items-center">
							<Label className="text-(--text) text-xs">No posts found.</Label>
						</Card>
					)}
					{Array.isArray(remainingPosts) &&
						remainingPosts.length >= 1 &&
						remainingPosts?.map((post: IPost) => {
							return (
								<article
									key={post.id}
									className="group py-6 first:pt-0 last:pb-0"
								>
									<Link
										to="/posts/$postId"
										params={{ postId: post.id.toString() }}
										className="grid sm:grid-cols-12 gap-4 sm:gap-6 items-start justify-between"
									>
										<div className="sm:col-span-8 space-y-2">
											<div className="flex items-center gap-3 text-xs text-(--text-secondary)">
												<span className="text-(--link) font-semibold uppercase tracking-wider">
													{post.categories && post.categories.length > 0
														? post.categories[0].name
														: "General"}
												</span>
												<span>•</span>
												<span className="flex items-center gap-1">
													<Clock className="w-3 h-3" />{" "}
													{new Date(post.date).toLocaleDateString()}
												</span>
											</div>

											<h4 className="text-lg sm:text-xl font-bold text-(--text) group-hover:text-(--link) transition-colors">
												{post.title}
											</h4>

											<p className="text-(--text-secondary) text-xs sm:text-sm line-clamp-2">
												{post.excerpt}
											</p>
										</div>

										{post.image && (
											<div className="sm:col-span-4 overflow-hidden rounded-lg bg-(--bg-secondary) aspect-[16/10] border border-(--border)">
												<img
													src={post.image}
													alt={post.title}
													className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
												/>
											</div>
										)}
									</Link>
								</article>
							);
						})}
				</div>
			</div>
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
