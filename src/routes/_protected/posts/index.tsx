import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { Session } from "better-auth";
import { Calendar, FileText, ImageIcon, Plus, Sparkles, Trash2, ArrowUpRight } from "lucide-react";
import { Suspense, useState } from "react";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { prisma } from "#/db";
import type { Post } from "#/lib/types";
import { getSessionFn } from "#/lib/utils";
import "#/index.css";

const getOwnPosts = createServerFn().handler(async () => {
    const session = await getSessionFn();
    const posts = await prisma.post.findMany({
        where: {
            userId: session?.user.id,
        },
        orderBy: { date: "desc" },
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-10 text-(--text) bg-(--bg) selection:bg-(--link)/20 selection:text-(--link)">
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
                    className="h-11 px-5 bg-(--link) hover:bg-(--link)/90 text-white font-semibold text-xs rounded-2xl shadow-lg shadow-(--link)/20 transition-all duration-300 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    <span>New Post</span>
                </Button>
            </div>

            {/* Content Listing */}
            <Suspense fallback={<PostListSkeleton count={5} />}>
                <PostListContent />
            </Suspense>
        </div>
    );
}

function PostListContent() {
    const { session }: { session: Session } = Route.useRouteContext();
    const userId = session.userId;
    const { data: posts } = useSuspenseQuery(postsQueryOptions(userId));

    if (posts.length === 0) {
        return <EmptyState />;
    }

    return (
        <div className="rounded-3xl overflow-hidden divide-y divide-(--border)/60 bg-(--bg-secondary)/40 border border-(--border) backdrop-blur-2xl shadow-2xl">
            {posts.map((post) => (
                <PostRow key={post.id} post={post} />
            ))}
        </div>
    );
}

function PostRow({ post }: { post: Post }) {
    const isDraft = post.status === "draft";
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
                        {post.category ? (
                            post.category.split(",").map((cat) => (
                                <span
                                    key={cat}
                                    className="rounded-full border border-(--border) bg-(--bg) px-2.5 py-0.5 text-[10px] font-bold text-(--link) capitalize tracking-wide shadow-xs"
                                >
                                    {capitalize(cat.trim())}
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
                    className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-xl bg-(--bg) border border-(--border) text-(--text) hover:text-(--link) hover:border-(--link)/40 transition-all shadow-xs"
                >
                    <span>View</span>
                    <ArrowUpRight className="w-3 h-3" />
                </Link>
                <Link
                    to="/posts/edit/$postId"
                    params={{ postId: post.id.toString() }}
                    className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-xl bg-(--link)/10 text-(--link) border border-(--link)/20 hover:bg-(--link) hover:text-white transition-all shadow-xs"
                >
                    <span>Edit</span>
                </Link>
            </div>
        </div>
    );
}

function PostRowSkeleton() {
    return (
        <div className="flex items-center gap-4 px-5 py-4 animate-pulse">
            <Skeleton className="w-16 h-16 rounded-2xl bg-(--bg) flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16 rounded-full bg-(--bg)" />
                    <Skeleton className="h-4 w-20 rounded-full bg-(--bg)" />
                </div>
                <Skeleton className="h-5 w-3/5 rounded bg-(--bg)" />
                <Skeleton className="h-3.5 w-24 rounded bg-(--bg)" />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <Skeleton className="h-8 w-14 rounded-xl bg-(--bg)" />
                <Skeleton className="h-8 w-14 rounded-xl bg-(--bg)" />
            </div>
        </div>
    );
}

function PostListSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="rounded-3xl overflow-hidden divide-y divide-(--border)/60 bg-(--bg-secondary)/40 border border-(--border)">
            {Array.from({ length: count }).map((_, index) => (
                <PostRowSkeleton key={index} />
            ))}
        </div>
    );
}

function EmptyState() {
    const navigate = useNavigate();

    return (
        <div className="text-center py-24 border border-dashed border-(--border) bg-(--bg-secondary)/30 backdrop-blur-xl flex justify-center flex-col items-center rounded-3xl shadow-inner space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-(--bg-secondary) border border-(--border) flex items-center justify-center text-(--link) shadow-inner">
                <FileText className="w-7 h-7" />
            </div>
            <div className="space-y-1">
                <h3 className="text-lg font-bold text-(--text)">No posts yet</h3>
                <p className="text-(--text-secondary) text-xs sm:text-sm max-w-xs mx-auto">
                    Write your first post to see it indexed here.
                </p>
            </div>
            <Button
                onClick={() => navigate({ to: "/posts/create" })}
                className="mt-2 h-10 px-4 bg-(--link) hover:bg-(--link)/90 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
            >
                Create your first post
            </Button>
        </div>
    );
}

function capitalize(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}