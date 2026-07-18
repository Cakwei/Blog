// app/routes/posts.$postId.tsx
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { JSONContent } from "@tiptap/core";
import { Highlight } from "@tiptap/extension-highlight";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import { Selection } from "@tiptap/extensions";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { sanitize } from "isomorphic-dompurify";
import { prisma } from "#/db";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import "#/index.css";

export const getPostById = createServerFn({ method: "GET" })
	// FIX: Change (postId) to ({ data: postId })
	.validator((postId: string) => postId)
	.handler(async ({ data: postId }) => {
		const post = await prisma.post.findUnique({
			where: { id: parseInt(postId, 10) },
		});

		if (!post) throw new Error("Post not found");
		return post;
	});

export const Route = createFileRoute("/posts/$postId")({
	loader: async ({ params }) => await getPostById({ data: params.postId }),
	component: PostPage,
});

function PostPage() {
	const post = Route.useLoaderData();
	const postContent =
		post.content === null || (post.content && Object.keys(post.content))
			? JSON.stringify(post.content)
			: '{"type": "doc", "content": []}';

	// Check if postContent obj is empty or not
	// TRUE: Continue w/ wtv is added from user @ tiptapEditor
	// FALSE: Return ""
	const content = generateHTML(JSON.parse(postContent) as JSONContent, [
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
	]);

	const sanitizedContent = sanitize(content);
	return (
		<article className="container max-w-3xl mx-auto py-20 px-4">
			<div className="space-y-4 text-center mb-12">
				<Badge variant="secondary" className="px-3 py-1">
					{post.category}
				</Badge>
				<h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
					{post.title}
				</h1>
				<div className="text-muted-foreground">
					Published on{" "}
					{new Date(post.date).toLocaleDateString("en", {
						day: "numeric",
						month: "long",
						year: "numeric",
					})}
				</div>
			</div>

			<img
				src={post.image}
				alt={post.title}
				className="w-full aspect-video object-cover rounded-xl mb-12 border shadow-lg"
			/>

			<div className="prose prose-slate max-w-none lg:prose-xl">
				<p className="text-xl leading-relaxed italic text-muted-foreground mb-8">
					{post.excerpt}
				</p>
				<Separator className="bg-neutral-300" />
			</div>

			<div
				/* biome-ignore lint/security/noDangerouslySetInnerHtml: Gyatt */
				dangerouslySetInnerHTML={{ __html: sanitizedContent }}
				className="prose prose-li:marker:text-black prose-quotes:text-black prose-blockquote:border-black mt-5"
			></div>
		</article>
	);
}
