// app/routes/posts.$postId.tsx
import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getPostById } from "../api/posts/$";

export const Route = createFileRoute("/posts/$postId")({
	loader: async ({ params }) => await getPostById({ data: params.postId }),
	component: PostPage,
});

function PostPage() {
	const post = Route.useLoaderData();

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
					{new Date(post.date).toLocaleDateString("en-US", {
						month: "long",
						day: "numeric",
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
				{/* Placeholder for real content */}
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
				</div>
			</div>
		</article>
	);
}
