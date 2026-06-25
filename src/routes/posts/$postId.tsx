// app/routes/posts.$postId.tsx

import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { generateHTML, type JSONContent } from "@tiptap/core";
import { Blockquote } from "@tiptap/extension-blockquote";
import { Bold } from "@tiptap/extension-bold";
import { Code } from "@tiptap/extension-code";
import { CodeBlock } from "@tiptap/extension-code-block";
import { Document } from "@tiptap/extension-document";
import { Heading } from "@tiptap/extension-heading";
import { Highlight } from "@tiptap/extension-highlight";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Text } from "@tiptap/extension-text";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import { Selection } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "dompurify";
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
		// console.log('Gyatt, ' + JSON.stringify(post.content))
		return post;
	});

export const Route = createFileRoute("/posts/$postId")({
	// This stays exactly how you want it!
	loader: async ({ params }) => await getPostById({ data: params.postId }),
	component: PostPage,
});

function PostPage() {
	const post = Route.useLoaderData();

	const content = generateHTML(post.content as JSONContent, [
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
	const sanitizedContent = DOMPurify.sanitize(content);
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
					{new Date(post.date).toLocaleDateString("en-MY", {
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
				<Separator className="my-8" />
				{/* Placeholder for real content 
				<div className="space-y-6 text-lg leading-7">
					<p>
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
						eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
						ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
						aliquip ex ea commodo consequat.
					</p>
					<h2 className="text-2xl font-bold">Getting Started with TanStack</h2>
					<p>
						Duis aute irure dolor in reprehenderit in voluptate velit esse
						cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
						cupidatat non proident, sunt in culpa qui officia deserunt mollit
						anim id est laborum.
					</p>
				</div>*/}
			</div>
			<div
				/* biome-ignore lint/security/noDangerouslySetInnerHtml: Gyatt */
				dangerouslySetInnerHTML={{ __html: sanitizedContent }}
				className="prose prose-li:marker:text-black prose-quotes:text-black prose-blockquote:border-black"
			></div>
		</article>
	);
}
