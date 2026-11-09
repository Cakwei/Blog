/** biome-ignore-all lint/suspicious/noArrayIndexKey: Ignore */
import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
	ArrowUpRight,
	Calendar,
	ChevronLeft,
	ChevronRight,
	Eye,
	ImageIcon,
	PenSquare,
	Plus,
	Sparkles,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { prisma } from "#/db";
import type { IResponse } from "#/lib/types";
import { getSessionFn } from "#/lib/utils";

export const getMyPostsServerFn = createServerFn({ method: "GET" })
	.validator(
		(data: {
			userId?: string;
			page?: number;
			limit?: number;
			search?: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		const session = await getSessionFn();
		if (!session?.user?.id) {
			return {
				success: false,
				data: [],
				totalPages: 1,
				totalCount: "0",
				currentPage: 1,
				message: "Unauthorized",
			} as IResponse;
		}

		const page = data.page && data.page > 0 ? data.page : 1;
		const limit = data.limit && data.limit > 0 ? data.limit : 5;
		const search = data.search?.trim() || "";
		const skip = (page - 1) * limit;

		const whereClause = {
			userId: session.user.id,
			...(search ? { title: { contains: search } } : {}),
		};

		const [posts, totalPosts] = await Promise.all([
			prisma.post.findMany({
				take: limit,
				skip,
				where: whereClause,
				include: {
					categories: true,
				},
				orderBy: { date: "desc" },
			}),
			prisma.post.count({ where: whereClause }),
		]);

		const totalPages = Math.max(1, Math.ceil(totalPosts / limit));

		return {
			success: true,
			data: posts,
			totalPages,
			totalCount: totalPosts.toString(),
			currentPage: page,
			message: "Successfully fetched posts",
		} as IResponse;
	});

export const deleteMyPostServerFn = createServerFn({ method: "POST" })
	.validator((postId: number) => postId)
	.handler(async ({ data: postId }) => {
		const session = await getSessionFn();
		if (!session?.user?.id) {
			throw new Error("Unauthorized");
		}

		const post = await prisma.post.findUnique({
			where: { id: postId },
			select: { userId: true },
		});

		if (!post) {
			throw new Error("Post not found");
		}

		if (post.userId !== session.user.id) {
			throw new Error("Forbidden: You cannot delete another user's post");
		}

		await prisma.post.delete({ where: { id: postId } });

		// Invalidate cache
		const { redis } = await import("#/lib/redis");
		await redis.invalidate(`posts:*`);
		await redis.invalidate(`og:svg:${postId}`);

		return { success: true, message: "Post deleted successfully" };
	});

const myPostsCourseQueryOptions = ({
	userId = "",
	page = 1,
	limit = 5,
}: {
	userId?: string;
	page?: number;
	limit?: number;
}) =>
	queryOptions({
		queryKey: ["myPosts", userId, page, limit],
		queryFn: () => getMyPostsServerFn({ data: { userId, page, limit } }),
		placeholderData: (prev) => prev,
		staleTime: 15000,
		gcTime: 15000,
	});

export const Route = createFileRoute("/_protected/posts/")({
	component: AdminPostsPage,
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(
			myPostsCourseQueryOptions({ userId: context.session?.user.id }),
		);
	},
});

function AdminPostsPage() {
	const navigate = useNavigate();

	return (
		<div className="w-full text-(--text) space-y-8">
			{/* Modern Dashboard Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-(--border) pb-6">
				<div className="space-y-1">
					<h1
						data-testid="yourPostsHeadingTitle"
						className="text-2xl sm:text-3xl font-bold tracking-tight text-(--text)"
					>
						Your Articles
					</h1>
					<p className="text-(--text-secondary) text-xs sm:text-sm">
						Manage, edit, and publish your essays, drafts, and technical notes.
					</p>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<Button
						data-testid="manageFeaturedBtn"
						onClick={() => navigate({ to: "/posts/featured" })}
						variant="outline"
						size="sm"
						className="px-3.5 h-9 border-(--border) bg-(--bg) hover:bg-(--bg-secondary) text-(--text-secondary) hover:text-(--text) font-medium text-xs rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-xs"
					>
						<Sparkles className="w-3.5 h-3.5 text-amber-400" />
						<span>Manage Featured</span>
					</Button>
					<Button
						data-testid="newPostBtn"
						onClick={() => navigate({ to: "/posts/create" })}
						size="sm"
						className="px-4 h-9 bg-(--text) hover:opacity-90 text-(--bg) font-medium text-xs rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-sm"
					>
						<Plus className="w-4 h-4" />
						<span>New Article</span>
					</Button>
				</div>
			</div>

			{/* Content Listing & Pagination */}
			<PostListContent />
		</div>
	);
}

function PostListContent() {
	const { session } = Route.useRouteContext();
	const userId = session?.user.id || "";

	const [page, setPage] = useState(1);
	const limit = 5;

	const { data, isLoading, isError, isPlaceholderData } = useQuery({
		queryKey: ["myPosts", userId, page, limit],
		queryFn: () => getMyPostsServerFn({ data: { userId, page, limit } }),
		placeholderData: (prev) => prev,
		staleTime: 15000,
		gcTime: 15000,
	});

	if (isLoading) {
		return <PostListSkeletonContainer count={limit} />;
	}

	const posts = data?.data;
	const totalPages = data?.totalPages || 1;

	if (isError || !data || !Array.isArray(posts) || posts.length === 0) {
		return <EmptyState />;
	}

	return (
		<div className="space-y-6">
			<div className="rounded-2xl overflow-hidden divide-y divide-(--border) bg-(--bg-secondary)/40 border border-(--border) backdrop-blur-md">
				{posts.map((post: any) => (
					<PostRow key={post.id} post={post} />
				))}
			</div>

			{/* Pagination Controls */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between border-t border-(--border) pt-4 px-1 text-xs text-(--text-secondary)">
					<p>
						Page <span className="font-semibold text-(--text)">{page}</span> of{" "}
						<span className="font-semibold text-(--text)">{totalPages}</span>
					</p>

					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((old) => Math.max(old - 1, 1))}
							disabled={page === 1}
							className="h-8 px-3 text-xs border-(--border) bg-(--bg) hover:bg-(--bg-secondary) disabled:opacity-40 cursor-pointer rounded-lg"
						>
							<ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
						</Button>

						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								if (!isPlaceholderData && page < totalPages) {
									setPage((old) => old + 1);
								}
							}}
							disabled={isPlaceholderData || page >= totalPages}
							className="h-8 px-3 text-xs border-(--border) bg-(--bg) hover:bg-(--bg-secondary) disabled:opacity-40 cursor-pointer rounded-lg"
						>
							Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

function PostRow({ post }: { post: any }) {
	const queryClient = useQueryClient();
	const isDraft = !post.published;
	const [imageError, setImageError] = useState(false);

	const deleteMutation = useMutation({
		mutationFn: async () => {
			return await deleteMyPostServerFn({ data: post.id });
		},
		onSuccess: (res) => {
			if (res.success) {
				toast.success("Article deleted successfully", {
					position: "top-center",
				});
				queryClient.invalidateQueries({ queryKey: ["myPosts"] });
			} else {
				toast.error(res.message || "Failed to delete article", {
					position: "top-center",
				});
			}
		},
		onError: (err: any) => {
			toast.error(err?.message || "Failed to delete article", {
				position: "top-center",
			});
		},
	});

	const handleDelete = () => {
		if (window.confirm(`Are you sure you want to delete "${post.title}"?`)) {
			deleteMutation.mutate();
		}
	};

	return (
		<div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5 hover:bg-(--bg-secondary) transition-colors group">
			{/* Post Thumbnail / Fallback */}
			<div className="w-full sm:w-20 h-28 sm:h-20 rounded-xl overflow-hidden bg-(--bg) border border-(--border) shrink-0 relative">
				{post.image && !imageError ? (
					<img
						src={post.image}
						alt=""
						onError={() => setImageError(true)}
						className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center bg-(--bg-secondary) text-(--text-muted)">
						<ImageIcon className="w-5 h-5" />
					</div>
				)}
			</div>

			{/* Details & Tags */}
			<div className="flex-1 min-w-0 space-y-2">
				<div className="flex flex-wrap items-center gap-2">
					<span
						className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
							isDraft
								? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
								: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
						}`}
					>
						{isDraft ? "Draft" : "Published"}
					</span>

					<div className="flex flex-wrap gap-1">
						{post.categories && post.categories.length > 0 ? (
							post.categories.map((cat: any) => (
								<span
									key={cat.id}
									className="rounded-full border border-(--border) bg-(--bg) px-2 py-0.5 text-[10px] font-medium text-(--text-secondary) capitalize"
								>
									{cat.name}
								</span>
							))
						) : (
							<span className="rounded-full border border-(--border) bg-(--bg) px-2 py-0.5 text-[10px] font-medium text-(--text-muted) capitalize">
								General
							</span>
						)}
					</div>
				</div>

				<h3 className="font-semibold text-sm sm:text-base text-(--text) truncate group-hover:text-(--link) transition-colors">
					{post.title}
				</h3>

				<div className="flex items-center gap-3 text-xs text-(--text-secondary)">
					<div className="flex items-center gap-1.5">
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

			{/* Action Buttons */}
			<div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 justify-end sm:justify-start">
				<Link
					to="/posts/$postId"
					params={{ postId: post.id.toString() }}
					className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-(--bg) border border-(--border) text-(--text-secondary) hover:text-(--text) hover:bg-(--bg-secondary) transition-colors"
				>
					<span>View</span>
					<ArrowUpRight className="w-3 h-3" />
				</Link>
				<Link
					data-testid="editPostBtn"
					to="/posts/edit/$postId"
					params={{ postId: post.id.toString() }}
					className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-(--text) text-(--bg) hover:opacity-90 transition-opacity"
				>
					<PenSquare className="w-3 h-3" />
					<span>Edit</span>
				</Link>
				<Button
					data-testid="deletePostBtn"
					onClick={handleDelete}
					disabled={deleteMutation.isPending}
					variant="ghost"
					size="sm"
					className="h-8 px-2.5 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10 text-xs transition-colors cursor-pointer"
					title="Delete Article"
				>
					<Trash2 className="w-3.5 h-3.5" />
				</Button>
			</div>
		</div>
	);
}

function PostListSkeleton() {
	return (
		<div className="w-full flex flex-col sm:flex-row sm:items-center gap-4 p-5 animate-pulse">
			<Skeleton className="w-full sm:w-20 h-28 sm:h-20 rounded-xl bg-(--bg) shrink-0" />
			<div className="flex-1 min-w-0 space-y-2">
				<div className="flex items-center gap-2">
					<Skeleton className="h-4 w-16 rounded-full bg-(--bg)" />
					<Skeleton className="h-4 w-20 rounded-full bg-(--bg)" />
				</div>
				<Skeleton className="h-5 w-3/5 rounded-md bg-(--bg)" />
				<Skeleton className="h-3.5 w-24 rounded-md bg-(--bg)" />
			</div>
			<div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
				<Skeleton className="h-8 w-14 rounded-lg bg-(--bg)" />
				<Skeleton className="h-8 w-14 rounded-lg bg-(--bg)" />
			</div>
		</div>
	);
}

function PostListSkeletonContainer({ count = 4 }: { count?: number }) {
	return (
		<div className="rounded-2xl w-full overflow-hidden divide-y divide-(--border) bg-(--bg-secondary)/40 border border-(--border)">
			{Array.from({ length: count }).map((_, index) => (
				<PostListSkeleton key={index} />
			))}
		</div>
	);
}

function EmptyState() {
	return (
		<div className="rounded-2xl border border-dashed border-(--border) p-8 sm:p-14 text-center bg-(--bg-secondary)/20">
			<div className="flex flex-col items-center max-w-sm mx-auto space-y-3">
				<div className="w-12 h-12 rounded-full bg-(--bg-secondary) border border-(--border) flex items-center justify-center text-(--text-muted)">
					<PenSquare className="w-5 h-5" />
				</div>
				<h3 className="text-lg font-semibold text-(--text)">
					No articles published yet
				</h3>
				<p className="text-xs sm:text-sm text-(--text-secondary) leading-relaxed">
					Your author dashboard is empty. Create your first article to share
					your ideas and research.
				</p>
			</div>
		</div>
	);
}
