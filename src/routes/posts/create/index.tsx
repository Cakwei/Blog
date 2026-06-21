import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/posts/create/")({
	component: NewPostPage,
});

function NewPostPage() {
	const navigate = useNavigate();

	return (
		<div className="max-w-6xl mx-auto px-4 py-12">
			<Link
				to="/posts"
				className="text-sm text-gray-500 hover:text-blue-600 transition-colors mb-4 inline-block"
			>
				← Back to your posts
			</Link>
			<h1 className="text-3xl font-bold mb-8">New post</h1>
		</div>
	);
}
