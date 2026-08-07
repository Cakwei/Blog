/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import axios from "axios";
import { ArrowUpRight, Clock, Flame, Sparkles } from "lucide-react";
import { Suspense } from "react";
import { Badge } from "#/components/ui/badge";
import { Skeleton } from "#/components/ui/skeleton";
import type { Post } from "#/generated/prisma/client";
import { API_URL } from "#/lib/const";
import type { IResponse } from "#/lib/types";
import { getHeadersCookieFn } from "#/lib/utils";

const postsQueryOptions = ({
	search = "",
	page = 1,
	limit = 20,
}: {
	search?: string;
	page?: number;
	limit?: number;
}) =>
	queryOptions({
		queryKey: ["posts"],
		queryFn: async () => {
			const cookie = await getHeadersCookieFn();
			const response = await axios.get(`${API_URL}/api/posts`, {
				params: { search: search, page: page, limit: limit },
				headers: { cookie: cookie },
			});
			console.log("oopppp", response.data);
			return response.data as IResponse;
		},
		refetchInterval: 1000 * 60,
	});

export const Route = createFileRoute("/")({
	loader: async ({ context }) => {
		context.queryClient.ensureQueryData(postsQueryOptions({}));
	},
	component: HomePage,
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
	const { data: posts } = useSuspenseQuery(postsQueryOptions({}));
	const postList = posts.data;
	const featuredPost = postList[0];
	const remainingPosts = postList.slice(1);

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
			{/* Featured Post - Editorial Magazine Style */}
			{featuredPost && (
				<section>
					<Link
						to="/posts/$postId"
						params={{ postId: featuredPost.id.toString() }}
						className="group grid lg:grid-cols-12 gap-6 items-center bg-(--bg-secondary)/30 p-6 sm:p-8 rounded-2xl border border-(--border) hover:border-(--link)/40 transition-all"
					>
						<div className="lg:col-span-7 overflow-hidden rounded-xl bg-(--bg) aspect-[16/10] border border-(--border)">
							{featuredPost.image && (
								<img
									src={featuredPost.image}
									alt={featuredPost.title}
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
									{new Date(featuredPost.date).toLocaleDateString()}
								</span>
							</div>

							<h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-(--text) group-hover:text-(--link) transition-colors leading-tight">
								{featuredPost.title}
							</h2>

							<p className="text-(--text-secondary) text-sm line-clamp-3 leading-relaxed">
								{featuredPost.excerpt}
							</p>

							<div className="pt-2 text-xs font-medium text-(--text-secondary) flex items-center gap-2">
								<span>
									By{" "}
									<strong className="text-(--text)">
										{featuredPost.user.displayUsername}
									</strong>
								</span>
							</div>
						</div>
					</Link>
				</section>
			)}

			{/* Clean Feed List Layout */}
			<div className="space-y-6 pt-4">
				<h3 className="text-xs font-bold uppercase tracking-widest text-(--text-secondary) border-b border-(--border) pb-3">
					Latest Releases
				</h3>

				<div className="divide-y divide-(--border)">
					{remainingPosts.map((post: Post) => {
						console.log(post, "blyat");
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
												{post.category
													? post.category.split(",")[0].trim()
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

/* -------------------------------------------------------------------------- */
/*                               Skeleton UI                                  */
/* -------------------------------------------------------------------------- */

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
						// biome-ignore lint/suspicious/noArrayIndexKey: No-fix atm
						<ArticleRowSkeleton key={i} />
					))}
				</div>
			</div>
		</div>
	);
}
