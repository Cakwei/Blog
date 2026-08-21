import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
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
import { Suspense, useEffect, useState } from "react";
import { prisma } from "#/db";
import { logger } from "#/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const getPostById = createServerFn({ method: "GET" })
	.validator((postId: string) => postId)
	.handler(async ({ data: postId }) => {
		const post = await prisma.post.findUnique({
			where: { id: parseInt(postId, 10) },
			include: {
				categories: true,
				user: true,
			},
		});

		if (!post) throw new Error("Post not found");
		return post;
	});

const postQueryOptions = (postId: string) =>
	queryOptions({
		queryKey: ["post", postId],
		queryFn: () => getPostById({ data: postId }),
		staleTime: 15000,
		gcTime: 15000,
		refetchInterval: 15000,
	});

export const Route = createFileRoute("/posts/$postId")({
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(postQueryOptions(params.postId));
	},
	component: PostRoutePage,
});

function PostRoutePage() {
	const { postId } = Route.useParams();

	return (
		<div className="bg-(--bg) min-h-screen text-(--text)">
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

	useEffect(() => {
		if (!post.content) {
			setRenderedHTML(
				"<p class='text-(--text-secondary) italic'>No content provided for this post.</p>",
			);
			return;
		}
		try {
			const jsonContent: JSONContent =
				typeof post.content === "string"
					? JSON.parse(post.content)
					: (post.content as JSONContent);

			const rawHtml = generateHTML(jsonContent, tptExtensions);
			setRenderedHTML(DOMPurify.sanitize(rawHtml));
		} catch (e) {
			logger("error", "Failed to parse or render post content", e);
			setRenderedHTML(
				"<p class='text-red-400'>Failed to load post content.</p>",
			);
		}
	}, [post.content]);

	return (
		<article className="container max-w-3xl mx-auto py-20 px-4">
			<div className="space-y-4 text-center mb-8">
				<div className="flex w-full gap-2.5 justify-center flex-wrap">
					{post.categories && post.categories.length > 0 ? (
						post.categories.map((cat) => (
							<Badge
								key={cat.id}
								variant="secondary"
								className="rounded-full bg-(--bg-secondary) border border-(--border) px-3.5 py-1 text-xs font-bold text-(--link) capitalize"
							>
								{cat.name}
							</Badge>
						))
					) : (
						<Badge
							variant="secondary"
							className="rounded-full bg-(--bg-secondary) border border-(--border) px-3.5 py-1 text-xs font-bold text-(--text-secondary)"
						>
							No tag
						</Badge>
					)}
				</div>
				<h1 className="text-4xl md:text-5xl text-(--text) font-extrabold tracking-tight">
					{post.title}
				</h1>
				<div className="text-(--text-secondary) text-xs flex items-center justify-center gap-2">
					<span>
						By{" "}
						<strong className="text-(--text)">
							{post.user?.displayUsername || post.user?.name || "Author"}
						</strong>
					</span>
					<span>•</span>
					<span>
						Published on{" "}
						{new Date(post.date).toLocaleDateString("en", {
							day: "numeric",
							month: "long",
							year: "numeric",
						})}
					</span>
				</div>
			</div>

			{post.image && (
				<div className="w-full flex justify-center items-center mb-8">
					<img
						src={post.image}
						alt={post.title}
						className="max-h-[400px] w-full object-cover rounded-2xl border border-(--border) shadow-xl bg-(--bg-secondary)"
					/>
				</div>
			)}

			{post.excerpt && (
				<div className="mb-8">
					<p className="text-xl leading-relaxed italic text-(--text-secondary)">
						{post.excerpt}
					</p>
					<Separator className="bg-(--border) my-6" />
				</div>
			)}

			{renderedHTML ? (
				<div
					/* biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized via DOMPurify */
					dangerouslySetInnerHTML={{ __html: renderedHTML }}
					className="prose prose-invert max-w-none text-(--text) prose-li:marker:text-(--text-secondary) prose-quotes:text-(--text-secondary) prose-blockquote:border-(--border) mt-5"
				/>
			) : (
				<div className="h-32 flex items-center justify-center text-(--text-secondary) text-sm animate-pulse">
					Loading content...
				</div>
			)}
		</article>
	);
}

function PostSkeleton() {
	return (
		<article className="container max-w-3xl mx-auto py-20 px-4 animate-pulse">
			<div className="space-y-4 text-center mb-8 flex flex-col items-center">
				<div className="h-6 w-28 bg-(--bg-secondary) border border-(--border) rounded-full" />
				<div className="h-12 w-4/5 bg-(--bg-secondary) border border-(--border) rounded-lg" />
				<div className="h-4 w-36 bg-(--bg-secondary) rounded" />
			</div>

			<div className="w-full h-[350px] bg-(--bg-secondary) border border-(--border) rounded-2xl mb-8" />

			<div className="space-y-3 mb-8">
				<div className="h-5 w-full bg-(--bg-secondary) rounded" />
				<div className="h-5 w-2/3 bg-(--bg-secondary) rounded" />
				<Separator className="bg-(--border) my-6" />
			</div>

			<div className="space-y-4">
				<div className="h-4 w-full bg-(--bg-secondary) rounded" />
				<div className="h-4 w-full bg-(--bg-secondary) rounded" />
				<div className="h-4 w-5/6 bg-(--bg-secondary) rounded" />
			</div>
		</article>
	);
}
