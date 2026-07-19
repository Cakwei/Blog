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
	beforeLoad: async ({ context }) => {
		context.queryClient.ensureQueryData(postsQueryOptions());
	},
	component: HomePage,
});

function HomePage() {
	const { data: posts, isSuccess } = useSuspenseQuery(postsQueryOptions());
	const featuredPost = posts[0];
	const remainingPosts = posts.slice(1);

	return (
		<div className="bg-black">
			<div className="max-w-6xl mx-auto px-4 py-12 bg-black">
				{/* Hero Section */}
				{isSuccess ? (
					<>
						<section className="">
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
									<span className="text-white font-extrabold uppercase tracking-wider text-sm">
										Featured Post
									</span>
									<h1 className="text-4xl font-bold mt-2 mb-4 group-hover:underline group-hover:underline-offset-5 text-white transition-colors">
										{featuredPost?.title}
									</h1>
									<p className="text-neutral-300 text-lg mb-4">
										{featuredPost?.excerpt}
									</p>
									<div className="flex items-center text-sm text-neutral-400">
										<span>{new Date(featuredPost?.date).toDateString()}</span>
										<span className="mx-2">•</span>
										<span>{featuredPost?.category || "Category not set"}</span>
									</div>
								</div>
							</Link>
							<hr className="my-10 border-neutral-700"></hr>
						</section>
						{/* Grid Section */}
						<div className="flex justify-between items-end mb-8">
							<h2 className="text-2xl text-white font-extrabold">
								Latest Articles
							</h2>
							<Link
								to="/"
								className="text-white hover:underline hover:text-white active:text-white"
							>
								<span className="text-white hover:underline">View all</span>
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
										<div className="flex gap-2.5 overflow-scroll scrollbar-none truncate">
											{post.category ? (
												post.category.split(",").map((cat) => (
													<span
														key={cat}
														className="rounded-full border px-3.5 py-1 text-xs font-bold text-white captitalize"
													>
														{cat}
													</span>
												))
											) : (
												<span className="rounded-full border px-3.5 py-1 text-xs font-bold text-white captitalize">
													{"No category"}
												</span>
											)}
										</div>

										<h3 className="text-xl font-bold mt-2 mb-2 group-hover:underline underline-offset-5 text-white transition-colors">
											{post.title}
										</h3>
										<p className="text-neutral-300 line-clamp-2 mb-4">
											{post.excerpt}
										</p>
										<p className="text-sm text-neutral-400">
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
		</div>
	);
}
