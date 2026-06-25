// import { getPosts } from '../utils/api'

import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Skeleton } from "#/components/ui/skeleton";
import { prisma } from "#/db";

const getRandomPosts = createServerFn().handler(async () => {
	// This runs only on the server
	const posts = await prisma.post.findMany({
		take: 10,
	});
	return posts;
});

const postsQueryOptions = () =>
	queryOptions({
		queryKey: ["posts"],
		queryFn: () => getRandomPosts(),
	});

export const Route = createFileRoute("/")({
	loader: async ({ context }) => {
		context.queryClient.ensureQueryData(postsQueryOptions());
	},
	component: HomePage,
});

function HomePage() {
	const { data: posts, isSuccess } = useSuspenseQuery(postsQueryOptions());
	const featuredPost = posts[0];
	const remainingPosts = posts.slice(1);

	return (
		<div className="max-w-6xl mx-auto px-4 py-12">
			{/* Hero Section */}
			{isSuccess ? (
				<>
					<section className="mb-16">
						<Link
							to="/posts/$postId"
							params={{ postId: featuredPost?.id.toString() }}
							className="group grid md:grid-cols-2 gap-8 items-center"
						>
							<div className="overflow-hidden rounded-2xl">
								<img
									src={featuredPost?.image}
									alt={featuredPost?.title}
									className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300"
								/>
							</div>
							<div>
								<span className="text-blue-600 font-semibold uppercase tracking-wider text-sm">
									Featured Post
								</span>
								<h1 className="text-4xl font-bold mt-2 mb-4 group-hover:text-blue-600 transition-colors">
									{featuredPost?.title}
								</h1>
								<p className="text-gray-600 text-lg mb-4">
									{featuredPost?.excerpt}
								</p>
								<div className="flex items-center text-sm text-gray-500">
									<span>{new Date(featuredPost?.date).toDateString()}</span>
									<span className="mx-2">•</span>
									<span>{featuredPost?.category}</span>
								</div>
							</div>
						</Link>
					</section>
					{/* Grid Section */}
					<div className="flex justify-between items-end mb-8">
						<h2 className="text-2xl font-bold">Latest Articles</h2>
						<Link to="/" className="text-blue-600 hover:underline">
							View all
						</Link>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
						{remainingPosts.map((post) => (
							<article key={post.id} className="group">
								<Link
									to="/posts/$postId"
									params={{ postId: post?.id.toString() }}
								>
									<div className="overflow-hidden rounded-xl mb-4">
										<img
											src={post.image}
											alt={post.title}
											className="w-full aspect-[16/10] object-cover group-hover:scale-105 transition-transform duration-300"
										/>
									</div>
									<span className="text-xs font-bold text-blue-500 uppercase">
										{post.category}
									</span>
									<h3 className="text-xl font-bold mt-2 mb-2 group-hover:text-blue-600 transition-colors">
										{post.title}
									</h3>
									<p className="text-gray-600 line-clamp-2 mb-4">
										{post.excerpt}
									</p>
									<p className="text-sm text-gray-400">
										{new Date(post.date).toDateString()}
									</p>
								</Link>
							</article>
						))}
					</div>
				</>
			) : (
				<>
					<Skeleton className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300" />
					{/* Grid Section */}
					<div className="flex justify-between items-end mb-8">
						<h2 className="text-2xl font-bold">Latest Articles</h2>
						<Link to="/" className="text-blue-600 hover:underline">
							View all
						</Link>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
						{remainingPosts.map((post) => (
							<article key={post.id} className="group">
								<Link
									to="/posts/$postId"
									params={{ postId: post?.id.toString() }}
								>
									<div className="overflow-hidden rounded-xl mb-4">
										<Skeleton className="w-full aspect-[16/10] object-cover group-hover:scale-105 transition-transform duration-300" />
									</div>
									<span className="text-xs font-bold text-blue-500 uppercase">
										{post.category}
									</span>
									<h3 className="text-xl font-bold mt-2 mb-2 group-hover:text-blue-600 transition-colors">
										{post.title}
									</h3>
									<p className="text-gray-600 line-clamp-2 mb-4">
										{post.excerpt}
									</p>
									<p className="text-sm text-gray-400">
										{new Date(post.date).toDateString()}
									</p>
								</Link>
							</article>
						))}
					</div>
				</>
			)}
		</div>
	);
}
