import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/core";
import { Highlight } from "@tiptap/extension-highlight";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import { Selection } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "dompurify";
import { Suspense, useEffect, useMemo, useState } from "react";
import { prisma } from "#/db";
import {
	calculateReadingTime,
	extractHeadingsFromTiptap,
	injectHeadingIdsIntoHtml,
	POST_VIEW_DWELL_TIME_MS,
} from "#/lib/reading-time";
import { logger } from "#/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TableOfContents } from "@/components/ui/tableOfContents";

export const getPostById = createServerFn({ method: "GET" })
	.validator((postId: string) => postId)
	.handler(async ({ data: postId }) => {
		const parsedId = parseInt(postId, 10);
		if (isNaN(parsedId) || parsedId <= 0) {
			throw new Error("Invalid post ID");
		}

		const post = await prisma.post.findUnique({
			where: { id: parsedId },
			include: {
				categories: true,
				user: {
					select: {
						id: true,
						name: true,
						displayUsername: true,
						image: true,
					},
				},
			},
		});

		if (!post) throw new Error("Post not found");

		// If post is a draft, only the author can view it
		if (!post.published) {
			const { getRequestHeader } = await import("@tanstack/react-start/server");
			const { auth } = await import("#/lib/auth");
			const cookie = getRequestHeader("Cookie") || "";
			const session = await auth.api.getSession({
				headers: { cookie },
			});
			if (!session?.user?.id || session.user.id !== post.userId) {
				throw new Error("Post not found");
			}
			return post;
		}

		// Return post data with current cached or persistent views
		const { redis } = await import("#/lib/redis");
		const cachedViews = await redis.get<number>(`post:${post.id}:views`);
		const liveViews =
			cachedViews !== null && cachedViews !== undefined
				? Number(cachedViews)
				: post.views;

		return {
			...post,
			views: Math.max(post.views, liveViews),
		};
	});

export const incrementPostViewServerFn = createServerFn({ method: "POST" })
	.validator((postId: number) => postId)
	.handler(async ({ data: postId }) => {
		try {
			if (!postId || isNaN(postId) || postId <= 0) {
				return { success: false, totalViews: 0 };
			}

			const { getRequestHeader } = await import("@tanstack/react-start/server");
			const { cache } = await import("#/lib/cache");

			const clientIp =
				getRequestHeader("x-forwarded-for") ||
				getRequestHeader("cf-connecting-ip") ||
				getRequestHeader("user-agent") ||
				"anonymous";

			const { totalViews, isNewView } = await cache.recordPostView(
				postId,
				clientIp,
			);

			// Synchronize with database if new view recorded
			if (isNewView) {
				await prisma.post.update({
					where: { id: postId },
					data: { views: { increment: 1 } },
				});
			}

			return { success: true, totalViews, isNewView };
		} catch (error) {
			logger("error", "Failed to increment post view:", error);
			return { success: false, totalViews: 0 };
		}
	});

const postQueryOptions = (postId: string) =>
	queryOptions({
		queryKey: ["post", postId],
		queryFn: () => getPostById({ data: postId }),
		staleTime: 60000,
		gcTime: 300000,
	});

export const Route = createFileRoute("/posts/$postId")({
	loader: async ({ context, params }) => {
		return await context.queryClient.ensureQueryData(postQueryOptions(params.postId));
	},
	head: ({ loaderData, params }) => {
		const post = loaderData;
		const title = post?.title ? `${post.title} | Charlee's Blog` : "Post | Charlee's Blog";
		const description =
			post?.excerpt || post?.title || "Read this article on Charlee's Blog";
		const ogImage = `/api/og/${params.postId}`;

		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ property: "og:title", content: title },
				{ property: "og:description", content: description },
				{ property: "og:type", content: "article" },
				{ property: "og:image", content: ogImage },
				{ name: "twitter:card", content: "summary_large_image" },
				{ name: "twitter:title", content: title },
				{ name: "twitter:description", content: description },
				{ name: "twitter:image", content: ogImage },
			],
		};
	},
	component: PostRoutePage,
});

function PostRoutePage() {
	const { postId } = Route.useParams();

	return (
		<div className="w-full">
			<Suspense fallback={<PostSkeleton />}>
				<PostContent postId={postId} />
			</Suspense>
		</div>
	);
}

const tptExtensions = [
	StarterKit.configure({
		horizontalRule: false,
		link: {
			openOnClick: false,
			enableClickSelection: true,
		},
	}),
	HorizontalRule,
	TextAlign.configure({ types: ["heading", "paragraph"] }),
	TaskList,
	TaskItem.configure({ nested: true }),
	Highlight.configure({ multicolor: true }),
	Image.configure({
		allowBase64: true,
	}),
	Typography,
	Superscript,
	Subscript,
	Selection,
];

function PostContent({ postId }: { postId: string }) {
	const { data: post } = useSuspenseQuery(postQueryOptions(postId));
	const [renderedHTML, setRenderedHTML] = useState<string>("");

	const [liveViews, setLiveViews] = useState<number>(post.views || 0);

	// Synchronize initial views if post object changes
	useEffect(() => {
		if (post.views !== undefined) {
			setLiveViews(post.views);
		}
	}, [post.views]);

	// Dwell time detection: Count as an authentic view after user reads for POST_VIEW_DWELL_TIME_MS
	useEffect(() => {
		// Only track views for published articles
		if (!post.published || !post.id) return;

		let hasRecorded = false;
		const timer = setTimeout(async () => {
			if (hasRecorded) return;
			hasRecorded = true;
			try {
				const res = await incrementPostViewServerFn({ data: post.id });
				if (res.success && res.totalViews) {
					setLiveViews(res.totalViews);
				}
			} catch (err) {
				logger("warn", "Post view record failed:", err);
			}
		}, POST_VIEW_DWELL_TIME_MS);

		return () => {
			clearTimeout(timer);
		};
	}, [post.id, post.published]);

	const parsedContent = useMemo(() => {
		if (!post.content) return null;
		try {
			return typeof post.content === "string"
				? JSON.parse(post.content)
				: (post.content as JSONContent);
		} catch {
			return null;
		}
	}, [post.content]);

	const readingTime = useMemo(
		() => calculateReadingTime(parsedContent),
		[parsedContent],
	);

	const tocHeadings = useMemo(
		() => extractHeadingsFromTiptap(parsedContent),
		[parsedContent],
	);

	useEffect(() => {
		if (!parsedContent) {
			setRenderedHTML(
				"<p class='text-(--text-secondary) italic'>No content provided for this post.</p>",
			);
			return;
		}
		try {
			const rawHtml = generateHTML(parsedContent, tptExtensions);
			const htmlWithAnchors = injectHeadingIdsIntoHtml(rawHtml, tocHeadings);
			setRenderedHTML(DOMPurify.sanitize(htmlWithAnchors));
		} catch (e) {
			logger("error", "Failed to parse or render post content", e);
			setRenderedHTML(
				"<p class='text-red-400'>Failed to load post content.</p>",
			);
		}
	}, [parsedContent, tocHeadings]);

	return (
		<div className="w-full space-y-6">
			{/* Top breadcrumb / navigation */}
			<div className="flex items-center justify-between text-xs text-(--text-secondary)">
				<Link
					to="/articles"
					className="inline-flex items-center gap-1.5 hover:text-(--text) transition-colors"
				>
					<ArrowLeft className="w-3.5 h-3.5" />
					<span>All articles</span>
				</Link>
			</div>

			<div className="flex flex-col lg:flex-row gap-8 xl:gap-10 justify-between relative">
				<article className="w-full flex-1 min-w-0 max-w-3xl">
					<header className="space-y-4 mb-8">
						<div className="flex w-full gap-2 items-center flex-wrap">
							{post.categories && post.categories.length > 0 ? (
								post.categories.map((cat) => (
									<Badge
										key={cat.id}
										variant="secondary"
										className="rounded-md bg-(--bg-secondary) border border-(--border) px-2.5 py-0.5 text-xs font-medium text-(--text-secondary) capitalize shadow-none"
									>
										{cat.name}
									</Badge>
								))
							) : (
								<Badge
									variant="secondary"
									className="rounded-md bg-(--bg-secondary) border border-(--border) px-2.5 py-0.5 text-xs font-medium text-(--text-muted) shadow-none"
								>
									General
								</Badge>
							)}
						</div>

						<h1
							data-testid="postTitle"
							className="text-3xl sm:text-4xl md:text-5xl text-(--text) font-bold tracking-tight leading-tight"
						>
							{post.title}
						</h1>

						<div className="text-(--text-secondary) text-xs flex items-center flex-wrap gap-2 pt-1 border-b border-(--border) pb-4">
							<span>
								By{" "}
								<strong className="text-(--text) font-medium">
									{post.user?.displayUsername || post.user?.name || "Author"}
								</strong>
							</span>
							<span>•</span>
							<span data-testid="publishedText">
								{new Date(post.date).toLocaleDateString("en-US", {
									day: "numeric",
									month: "short",
									year: "numeric",
								})}
							</span>
							<span>•</span>
							<span data-testid="readingTimeText">{readingTime.text}</span>
							{liveViews !== undefined && liveViews > 0 && (
								<>
									<span>•</span>
									<span data-testid="viewCountText">
										{liveViews.toLocaleString()}{" "}
										{liveViews === 1 ? "view" : "views"}
									</span>
								</>
							)}
						</div>
					</header>

					{/* Mobile Collapsible TOC */}
					<TableOfContents headings={tocHeadings} variant="mobile" />

					{post.image && (
						<div className="w-full overflow-hidden rounded-xl border border-(--border) mb-8 bg-(--bg-secondary)">
							<img
								src={post.image}
								alt={post.title}
								className="max-h-[420px] w-full object-cover"
							/>
						</div>
					)}

					{post.excerpt && (
						<div className="mb-8">
							<p className="text-lg leading-relaxed text-(--text-secondary) font-normal">
								{post.excerpt}
							</p>
							<Separator className="bg-(--border) my-6" />
						</div>
					)}

					{renderedHTML ? (
						<div
							/* biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized via DOMPurify */
							dangerouslySetInnerHTML={{ __html: renderedHTML }}
							className="prose dark:prose-invert max-w-none text-(--text) prose-headings:text-(--text) prose-headings:font-bold prose-headings:tracking-tight prose-headings:scroll-mt-24 prose-p:text-(--text) prose-p:leading-relaxed prose-a:text-(--link) hover:prose-a:underline prose-li:marker:text-(--text-secondary) prose-quotes:text-(--text-secondary) prose-blockquote:border-(--border) prose-code:text-(--link) mt-8"
						/>
					) : (
						<div className="h-32 flex items-center justify-center text-(--text-secondary) text-xs animate-pulse">
							Loading content...
						</div>
					)}
				</article>

				{/* Desktop Sticky Sidebar TOC */}
				<TableOfContents headings={tocHeadings} variant="desktop" />
			</div>
		</div>
	);
}

function PostSkeleton() {
	return (
		<article className="max-w-3xl space-y-6 animate-pulse">
			<div className="space-y-4">
				<div className="h-5 w-24 bg-(--bg-secondary) border border-(--border) rounded" />
				<div className="h-10 w-4/5 bg-(--bg-secondary) border border-(--border) rounded" />
				<div className="h-4 w-48 bg-(--bg-secondary) rounded" />
			</div>

			<div className="w-full h-[320px] bg-(--bg-secondary) border border-(--border) rounded-xl" />

			<div className="space-y-3 pt-4">
				<div className="h-4 w-full bg-(--bg-secondary) rounded" />
				<div className="h-4 w-full bg-(--bg-secondary) rounded" />
				<div className="h-4 w-2/3 bg-(--bg-secondary) rounded" />
			</div>
		</article>
	);
}
