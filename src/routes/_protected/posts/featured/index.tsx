import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
	ArrowLeft,
	ArrowUpRight,
	Calendar,
	Eye,
	ImageIcon,
	PenSquare,
	Search,
	Sparkles,
	Star,
	StarOff,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Skeleton } from "#/components/ui/skeleton";
import { prisma } from "#/db";
import type { IResponse } from "#/lib/types";
import { getSessionFn, logger } from "#/lib/utils";

// Server Function: Fetch user's published and draft posts with featured status
export const getManageFeaturedPostsServerFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const session = await getSessionFn();
	if (!session?.user?.id) {
		return {
			success: false,
			data: [],
			message: "Unauthorized",
		} as IResponse;
	}

	const posts = await prisma.post.findMany({
		where: { userId: session.user.id },
		orderBy: [{ isFeatured: "desc" }, { date: "desc" }],
		include: {
			categories: true,
		},
	});

	return {
		success: true,
		data: posts,
		message: "Successfully fetched posts",
	} as IResponse;
});

// Server Function: Toggle or set isFeatured state
export const toggleFeaturedPostServerFn = createServerFn({ method: "POST" })
	.validator((data: { postId: number; isFeatured: boolean }) => data)
	.handler(async ({ data }) => {
		try {
			const session = await getSessionFn();
			if (!session?.user?.id) {
				return { success: false, message: "Unauthorized" };
			}

			const post = await prisma.post.findUnique({
				where: { id: data.postId },
				select: { id: true, userId: true, title: true },
			});

			if (!post || post.userId !== session.user.id) {
				return {
					success: false,
					message: "Post not found or unauthorized to edit",
				};
			}

			const updated = await prisma.post.update({
				where: { id: data.postId },
				data: { isFeatured: data.isFeatured },
			});

			// Invalidate homepage cache in Redis
			const { redis } = await import("#/lib/redis");
			await redis.invalidate("posts:*");

			return {
				success: true,
				isFeatured: updated.isFeatured,
				message: updated.isFeatured
					? `"${post.title}" is now set as a featured article.`
					: `"${post.title}" removed from featured articles.`,
			};
		} catch (error) {
			logger("error", "Failed to update featured post:", error);
			return { success: false, message: "Failed to update featured state" };
		}
	});

// Server Function: Set primary featured post (exclusively sets one post as featured or resets)
export const setPrimaryFeaturedPostServerFn = createServerFn({
	method: "POST",
})
	.validator((postId: number) => postId)
	.handler(async ({ data: postId }) => {
		try {
			const session = await getSessionFn();
			if (!session?.user?.id) {
				return { success: false, message: "Unauthorized" };
			}

			const post = await prisma.post.findUnique({
				where: { id: postId },
				select: { id: true, userId: true, title: true },
			});

			if (!post || post.userId !== session.user.id) {
				return {
					success: false,
					message: "Post not found or unauthorized to edit",
				};
			}

			// Clear other featured posts for this user and set this one
			await prisma.$transaction([
				prisma.post.updateMany({
					where: { userId: session.user.id, isFeatured: true },
					data: { isFeatured: false },
				}),
				prisma.post.update({
					where: { id: postId },
					data: { isFeatured: true },
				}),
			]);

			// Invalidate homepage cache in Redis
			const { redis } = await import("#/lib/redis");
			await redis.invalidate("posts:*");

			return {
				success: true,
				message: `"${post.title}" is now the spotlight featured article on the homepage.`,
			};
		} catch (error) {
			logger("error", "Failed to set primary featured post:", error);
			return {
				success: false,
				message: "Failed to set primary featured article",
			};
		}
	});

const featuredPostsQueryOptions = () =>
	queryOptions({
		queryKey: ["featuredPostsManage"],
		queryFn: () => getManageFeaturedPostsServerFn(),
		staleTime: 10000,
		gcTime: 30000,
	});

export const Route = createFileRoute("/_protected/posts/featured/")({
	component: ManageFeaturedPostsPage,
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(featuredPostsQueryOptions());
	},
});

function ManageFeaturedPostsPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [searchQuery, setSearchQuery] = useState("");
	const [filterStatus, setFilterStatus] = useState<"ALL" | "FEATURED" | "NORMAL">("ALL");

	const { data, isLoading, isError } = useQuery(featuredPostsQueryOptions());

	const toggleMutation = useMutation({
		mutationFn: async (vars: { postId: number; isFeatured: boolean }) => {
			return await toggleFeaturedPostServerFn({ data: vars });
		},
		onSuccess: (res) => {
			if (res.success) {
				toast.success(res.message);
				queryClient.invalidateQueries({ queryKey: ["featuredPostsManage"] });
				queryClient.invalidateQueries({ queryKey: ["myPosts"] });
				queryClient.invalidateQueries({ queryKey: ["posts"] });
			} else {
				toast.error(res.message || "Failed to toggle featured status");
			}
		},
		onError: (err: any) => {
			toast.error(err?.message || "Failed to update featured status");
		},
	});

	const makePrimaryMutation = useMutation({
		mutationFn: async (postId: number) => {
			return await setPrimaryFeaturedPostServerFn({ data: postId });
		},
		onSuccess: (res) => {
			if (res.success) {
				toast.success(res.message);
				queryClient.invalidateQueries({ queryKey: ["featuredPostsManage"] });
				queryClient.invalidateQueries({ queryKey: ["myPosts"] });
				queryClient.invalidateQueries({ queryKey: ["posts"] });
			} else {
				toast.error(res.message || "Failed to set spotlight article");
			}
		},
		onError: (err: any) => {
			toast.error(err?.message || "Failed to set spotlight article");
		},
	});

	const allPosts = Array.isArray(data?.data) ? data.data : [];

	const filteredPosts = useMemo(() => {
		return allPosts.filter((post: any) => {
			const matchesSearch =
				post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(post.excerpt &&
					post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()));

			if (!matchesSearch) return false;

			if (filterStatus === "FEATURED") return post.isFeatured;
			if (filterStatus === "NORMAL") return !post.isFeatured;
			return true;
		});
	}, [allPosts, searchQuery, filterStatus]);

	const featuredCount = allPosts.filter((p: any) => p.isFeatured).length;

	return (
		<div className="w-full text-(--text) space-y-8 max-w-4xl mx-auto">
			{/* Top Navigation & Return Link */}
			<div className="space-y-4">
				<button
					type="button"
					onClick={() => navigate({ to: "/posts" })}
					className="inline-flex items-center gap-1.5 text-xs text-(--text-secondary) hover:text-(--text) transition-colors cursor-pointer"
				>
					<ArrowLeft className="w-3.5 h-3.5" />
					<span>Back to Articles</span>
				</button>

				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-(--border) pb-6">
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<Sparkles className="w-5 h-5 text-amber-400" />
							<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-(--text)">
								Featured Articles
							</h1>
						</div>
						<p className="text-(--text-secondary) text-xs sm:text-sm">
							Curate spotlight stories highlighted on your homepage hero section.
						</p>
					</div>

					<div className="flex items-center gap-2 bg-(--bg-secondary)/60 border border-(--border) px-3 py-1.5 rounded-xl text-xs font-medium">
						<Star className="w-4 h-4 text-amber-400 fill-amber-400" />
						<span>
							<strong className="text-(--text)">{featuredCount}</strong> featured{" "}
							{featuredCount === 1 ? "story" : "stories"}
						</span>
					</div>
				</div>
			</div>

			{/* Filter & Search Bar */}
			<div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
				<div className="relative flex-1 max-w-sm">
					<Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
					<Input
						placeholder="Search your articles..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9 h-9 text-xs rounded-xl bg-(--bg-secondary)/40 border-(--border)"
					/>
				</div>

				<div className="flex items-center gap-1.5 bg-(--bg-secondary)/40 p-1 rounded-xl border border-(--border)">
					<button
						type="button"
						onClick={() => setFilterStatus("ALL")}
						className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
							filterStatus === "ALL"
								? "bg-(--bg) text-(--text) shadow-xs"
								: "text-(--text-secondary) hover:text-(--text)"
						}`}
					>
						All ({allPosts.length})
					</button>
					<button
						type="button"
						onClick={() => setFilterStatus("FEATURED")}
						className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
							filterStatus === "FEATURED"
								? "bg-(--bg) text-(--text) shadow-xs"
								: "text-(--text-secondary) hover:text-(--text)"
						}`}
					>
						Featured ({featuredCount})
					</button>
					<button
						type="button"
						onClick={() => setFilterStatus("NORMAL")}
						className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
							filterStatus === "NORMAL"
								? "bg-(--bg) text-(--text) shadow-xs"
								: "text-(--text-secondary) hover:text-(--text)"
						}`}
					>
						Standard ({allPosts.length - featuredCount})
					</button>
				</div>
			</div>

			{/* Posts List */}
			{isLoading ? (
				<div className="space-y-3">
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-24 w-full rounded-2xl bg-(--bg-secondary)" />
					))}
				</div>
			) : isError || filteredPosts.length === 0 ? (
				<div className="text-center py-16 px-4 rounded-2xl border border-(--border) bg-(--bg-secondary)/30 space-y-3">
					<Sparkles className="w-8 h-8 text-(--text-muted) mx-auto" />
					<h3 className="text-sm font-semibold text-(--text)">
						{allPosts.length === 0
							? "No articles found in your account"
							: "No matching articles found"}
					</h3>
					<p className="text-xs text-(--text-secondary) max-w-sm mx-auto">
						{allPosts.length === 0
							? "Create and publish an article first before marking it as featured."
							: "Try adjusting your search query or filter."}
					</p>
					{allPosts.length === 0 && (
						<Button
							size="sm"
							onClick={() => navigate({ to: "/posts/create" })}
							className="mt-2 text-xs"
						>
							Create New Article
						</Button>
					)}
				</div>
			) : (
				<div className="rounded-2xl overflow-hidden divide-y divide-(--border) bg-(--bg-secondary)/40 border border-(--border) backdrop-blur-md">
					{filteredPosts.map((post: any) => {
						const isFeatured = Boolean(post.isFeatured);
						const isDraft = !post.published;

						return (
							<div
								key={post.id}
								className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 transition-colors group ${
									isFeatured
										? "bg-amber-500/5 hover:bg-amber-500/10"
										: "hover:bg-(--bg-secondary)"
								}`}
							>
								{/* Thumbnail & Info */}
								<div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
									<div className="w-16 h-16 rounded-xl overflow-hidden bg-(--bg) border border-(--border) shrink-0 relative">
										{post.image ? (
											<img
												src={post.image}
												alt=""
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center text-(--text-muted)">
												<ImageIcon className="w-5 h-5" />
											</div>
										)}
									</div>

									<div className="space-y-1.5 min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											{isFeatured && (
												<Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1 shadow-none">
													<Star className="w-3 h-3 fill-amber-500" />
													Featured
												</Badge>
											)}
											<span
												className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
													isDraft
														? "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20"
														: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
												}`}
											>
												{isDraft ? "Draft" : "Published"}
											</span>
											{post.categories && post.categories.length > 0 && (
												<span className="text-[10px] text-(--text-secondary) font-mono">
													#{post.categories[0].name}
												</span>
											)}
										</div>

										<h3 className="font-semibold text-sm sm:text-base text-(--text) truncate">
											{post.title}
										</h3>

										<div className="flex items-center gap-3 text-xs text-(--text-secondary)">
											<div className="flex items-center gap-1">
												<Calendar className="w-3.5 h-3.5 text-(--text-muted)" />
												<span>
													{new Date(post.date).toLocaleDateString("en-US", {
														month: "short",
														day: "numeric",
														year: "numeric",
													})}
												</span>
											</div>
											{post.views !== undefined && (
												<div className="flex items-center gap-1">
													<Eye className="w-3.5 h-3.5 text-(--text-muted)" />
													<span>
														{post.views} {post.views === 1 ? "view" : "views"}
													</span>
												</div>
											)}
										</div>
									</div>
								</div>

								{/* Control Actions */}
								<div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 justify-end sm:justify-start">
									{/* Toggle Featured Button */}
									<Button
										variant="outline"
										size="sm"
										disabled={
											toggleMutation.isPending || makePrimaryMutation.isPending
										}
										onClick={() =>
											toggleMutation.mutate({
												postId: post.id,
												isFeatured: !isFeatured,
											})
										}
										className={`h-8 px-3 text-xs rounded-lg border transition-all cursor-pointer ${
											isFeatured
												? "border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
												: "border-(--border) bg-(--bg) text-(--text-secondary) hover:text-(--text) hover:bg-(--bg-secondary)"
										}`}
									>
										{isFeatured ? (
											<>
												<StarOff className="w-3.5 h-3.5 mr-1.5" />
												<span>Unfeature</span>
											</>
										) : (
											<>
												<Star className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
												<span>Feature</span>
											</>
										)}
									</Button>

									{/* Set as Single Spotlight Button */}
									{!isFeatured && (
										<Button
											variant="ghost"
											size="sm"
											title="Set this as the only primary featured post"
											disabled={
												toggleMutation.isPending || makePrimaryMutation.isPending
											}
											onClick={() => makePrimaryMutation.mutate(post.id)}
											className="h-8 px-2.5 text-xs text-(--text-secondary) hover:text-(--text) hover:bg-(--bg-secondary) rounded-lg cursor-pointer hidden sm:inline-flex"
										>
											<Sparkles className="w-3.5 h-3.5 mr-1 text-amber-400" />
											<span>Make Spotlight</span>
										</Button>
									)}

									{/* Direct Link to Edit */}
									<Link
										to="/posts/edit/$postId"
										params={{ postId: post.id.toString() }}
										className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-(--bg) border border-(--border) text-(--text-secondary) hover:text-(--text) hover:bg-(--bg-secondary) transition-colors"
										title="Edit Article"
									>
										<PenSquare className="w-3.5 h-3.5" />
									</Link>

									{/* View Article */}
									<Link
										to="/posts/$postId"
										params={{ postId: post.id.toString() }}
										className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-(--bg) border border-(--border) text-(--text-secondary) hover:text-(--text) hover:bg-(--bg-secondary) transition-colors"
										title="View Article"
									>
										<ArrowUpRight className="w-3.5 h-3.5" />
									</Link>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
