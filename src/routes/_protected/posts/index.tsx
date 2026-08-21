/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import axios from "axios";
import {
	ArrowUpRight,
	Calendar,
	ChevronLeft,
	ChevronRight,
	ImageIcon,
	Plus,
	Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { API_URL } from "#/lib/const";
import type { IResponse } from "#/lib/types";
import { getHeadersCookieFn } from "#/lib/utils";

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
		queryFn: async () => await fetchPaginatedPosts({ userId, page, limit }),
		placeholderData: (prev) => prev,
		staleTime: 15000,
		gcTime: 15000,
		refetchInterval: 15000,
	});

async function fetchPaginatedPosts({
	userId,
	page,
	limit,
}: {
	userId: string;
	page: number;
	limit: number;
}) {
	const response = await axios.get(`${API_URL}/api/posts/${userId}`, {
		params: { page, limit },
		...(typeof window === "undefined"
			? { headers: { cookie: await getHeadersCookieFn() } }
			: { withCredentials: true }),
	});
	const posts = response.data;

	if (!posts.success) {
		return { data: [], totalPages: 1, totalCount: 0, currentPage: 1 };
	}

	return posts as IResponse;
}

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
		<div className="flex justify-center w-full bg-(--bg)">
			<div className="w-full max-w-6xl portrait:min-h-[75vh] landscape:min-h-[60vh] px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-10 text-(--text) selection:bg-(--link)/20 selection:text-(--link)">
				{/* Ambient Background Glow */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-(--link)/10 via-transparent to-transparent blur-3xl pointer-events-none -z-10" />

				{/* Header Section */}
				<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-(--border)/60 pb-8">
					<div className="space-y-2">
						<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-(--link)/10 border border-(--link)/20 text-(--link) text-[11px] font-bold uppercase tracking-widest">
							<Sparkles className="w-3 h-3" /> Dashboard
						</div>
						<h1 className="text-3xl sm:text-4xl font-black tracking-tight text-(--text)">
							Your Articles.
						</h1>
						<p className="text-(--text-secondary) text-xs sm:text-sm">
							Create, edit, manage, and publish your personal blog content.
						</p>
					</div>
					<Button
						onClick={() => navigate({ to: "/posts/create" })}
						className="px-5 bg-(--link) hover:bg-(--link)/90 text-white font-semibold text-xs rounded-md shadow-lg shadow-(--link)/20 transition-all duration-300 flex items-center gap-2 cursor-pointer"
					>
						<Plus className="w-4 h-4" />
						<span>New Post</span>
					</Button>
				</div>

				{/* Content Listing & Pagination */}
				<PostListContent />
			</div>
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
		queryFn: async () => await fetchPaginatedPosts({ userId, page, limit }),
		placeholderData: (prev) => prev,
		staleTime: 15000,
		gcTime: 15000,
		refetchInterval: 15000,
	});

	if (isLoading) {
		return <PostListSkeletonContainer count={limit} />;
	}

	const posts = data?.data;
	const totalPages = data?.totalPages;

	if (isError || !data || !Array.isArray(posts) || posts.length === 0) {
		return <EmptyState />;
	}

	return (
		<div className="space-y-6">
			<div className="rounded-3xl overflow-hidden divide-y divide-(--border)/60 bg-(--bg-secondary)/40 border border-(--border) backdrop-blur-2xl shadow-2xl">
				{posts.map((post: any) => (
					<PostRow key={post.id} post={post} />
				))}
			</div>

			{/* Pagination Controls */}
			{totalPages && totalPages > 1 && (
				<div className="flex items-center justify-between border-t border-(--border)/60 pt-4 px-2">
					<p className="text-xs text-(--text-secondary)">
						Page <span className="font-semibold text-(--text)">{page}</span> of{" "}
						<span className="font-semibold text-(--text)">{totalPages}</span>
					</p>

					<div className="flex items-center gap-2">
						<Button
							onClick={() => setPage((old) => Math.max(old - 1, 1))}
							disabled={page === 1}
							className="h-8 px-3 text-xs border-(--border) bg-(--bg-secondary) hover:bg-(--bg-secondary)/80 disabled:opacity-50 cursor-pointer"
						>
							<ChevronLeft className="w-4 h-4 mr-1" /> Previous
						</Button>

						<Button
							onClick={() => {
								if (!isPlaceholderData && page < totalPages) {
									setPage((old) => old + 1);
								}
							}}
							disabled={isPlaceholderData || page >= totalPages}
							className="h-8 px-3 text-xs border-(--border) bg-(--bg-secondary) hover:bg-(--bg-secondary)/80 disabled:opacity-50 cursor-pointer"
						>
							Next <ChevronRight className="w-4 h-4 ml-1" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

function PostRow({ post }: { post: any }) {
	const isDraft = !post.published;
	const [imageError, setImageError] = useState(false);

	return (
		<div className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 hover:bg-(--bg-secondary) transition-all group">
			{/* Post Thumbnail / Fallback */}
			<div className="w-full sm:w-16 h-28 sm:h-16 rounded-2xl overflow-hidden bg-(--bg) border border-(--border) flex-shrink-0 relative">
				{post.image && !imageError ? (
					<img
						src={post.image}
						alt=""
						onError={() => setImageError(true)}
						className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center bg-(--bg-secondary) text-(--text-secondary)">
						<ImageIcon className="w-4 h-4 text-(--link)" />
					</div>
				)}
			</div>

			{/* Details & Tags */}
			<div className="flex-1 min-w-0 space-y-1.5">
				<div className="flex flex-wrap items-center gap-2">
					<span
						className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
							isDraft
								? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
								: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
						}`}
					>
						{isDraft ? "Draft" : "Published"}
					</span>

					<div className="flex flex-wrap gap-1">
						{post.categories && post.categories.length > 0 ? (
							post.categories.map((cat: any) => (
								<span
									key={cat.id}
									className="rounded-full border border-(--border) bg-(--bg) px-2.5 py-0.5 text-[10px] font-bold text-(--link) capitalize tracking-wide shadow-xs"
								>
									{cat.name}
								</span>
							))
						) : (
							<span className="rounded-full border border-(--border) bg-(--bg) px-2.5 py-0.5 text-[10px] font-bold text-(--text-secondary) capitalize tracking-wide">
								General
							</span>
						)}
					</div>
				</div>

				<h3 className="font-bold text-sm sm:text-base text-(--text) truncate group-hover:text-(--link) transition-colors">
					{post.title}
				</h3>

				<div className="flex items-center gap-1.5 text-xs text-(--text-secondary) font-medium">
					<Calendar className="w-3.5 h-3.5 text-(--link)" />
					<span>{new Date(post.date).toLocaleDateString("en-MY")}</span>
				</div>
			</div>

			{/* Actions */}
			<div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0 pt-2 sm:pt-0">
				<Link
					to="/posts/$postId"
					params={{ postId: post.id.toString() }}
					className="group/2 inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-full bg-(--bg) border border-(--border) text-(--text) hover:text-(--link) hover:border-(--link)/40 transition-all shadow-xs"
				>
					<span className="text-(--link) group-hover/2:text-(--text)">
						View
					</span>
					<ArrowUpRight className="w-3 h-3 group-hover/2:text-(--text) text-(--link)" />
				</Link>
				<Link
					to="/posts/edit/$postId"
					params={{ postId: post.id.toString() }}
					className="group/2 inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-md bg-(--link)/10 text-(--link) border border-(--link)/20 hover:bg-(--link) hover:text-white transition-all shadow-xs"
				>
					<span className="text-(--link) group-hover/2:text-(--text)">
						Edit
					</span>
				</Link>
			</div>
		</div>
	);
}

function PostListSkeleton() {
	return (
		<div className="w-full flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 animate-pulse">
			<Skeleton className="w-full sm:w-16 h-28 sm:h-16 rounded-2xl bg-(--bg) flex-shrink-0" />
			<div className="flex-1 min-w-0 space-y-2">
				<div className="flex items-center gap-2">
					<Skeleton className="h-4 w-16 rounded-full bg-(--bg)" />
					<Skeleton className="h-4 w-20 rounded-full bg-(--bg)" />
				</div>
				<Skeleton className="h-5 w-3/5 rounded-md bg-(--bg)" />
				<Skeleton className="h-3.5 w-24 rounded-md bg-(--bg)" />
			</div>
			<div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0 pt-2 sm:pt-0">
				<Skeleton className="h-8 w-14 rounded-xl bg-(--bg)" />
				<Skeleton className="h-8 w-14 rounded-xl bg-(--bg)" />
			</div>
		</div>
	);
}

function PostListSkeletonContainer({ count = 4 }: { count?: number }) {
	return (
		<div className="rounded-3xl w-full overflow-hidden divide-y divide-(--border)/60 bg-(--bg-secondary)/40 border border-(--border) backdrop-blur-2xl shadow-2xl">
			{Array.from({ length: count }).map((_, index) => (
				<PostListSkeleton key={index} />
			))}
		</div>
	);
}

function EmptyState() {
	const navigate = useNavigate();

	return (
		<div className="relative overflow-hidden rounded-md border border-dashed border-(--border) p-8 sm:p-14 text-center backdrop-blur-2xl shadow-xl transition-all">
			{/* Soft Ambient Glow Effect */}
			<div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-(--link)/10 blur-3xl rounded-full pointer-events-none" />

			<div className="relative z-10 flex flex-col items-center max-w-sm mx-auto space-y-5">
				{/* Typography */}
				<div className="space-y-1.5">
					<h3 className="text-xl font-bold text-(--text)">
						No articles published yet
					</h3>
					<p className="text-xs sm:text-sm text-(--text-secondary) leading-relaxed">
						Your dashboard is empty. Start writing today to share your knowledge
						and engage with your readers.
					</p>
				</div>
			</div>
		</div>
	);
}
