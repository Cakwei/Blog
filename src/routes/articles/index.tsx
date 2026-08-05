import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import debounce from "lodash.debounce";
import {
	createContext,
	Suspense,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
} from "react";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { prisma } from "#/db";
import { CATEGORIES } from "#/lib/const";

type ArticlesSearch = {
	search?: string | "";
	category?: "ALL" | (string & {});
};

const getFilteredPosts = createServerFn({ method: "GET" })
	.validator((data: ArticlesSearch) => data)
	.handler(async ({ data }) => {
		const { search, category } = data;

		const normalizedCategory = category ? category.toLowerCase() : "all";
		const isValidCategory =
			normalizedCategory === "all" ||
			CATEGORIES.some((cat) => cat.toLowerCase() === normalizedCategory);

		const categoryFilter =
			isValidCategory && normalizedCategory !== "all"
				? normalizedCategory
				: undefined;

		const posts = await prisma.post.findMany({
			where: {
				AND: [
					search
						? {
								OR: [
									{ title: { contains: search } },
									{ excerpt: { contains: search } },
								],
							}
						: {},
					categoryFilter ? { category: { contains: categoryFilter } } : {},
				],
			},
			orderBy: { date: "desc" },
			select: {
				id: true,
				category: true,
				content: true,
				date: true,
				excerpt: true,
				image: true,
				title: true,
				userId: true,
				user: {
					select: {
						displayUsername: true,
					},
				},
			},
		});
		return posts;
	});

const postsQueryOptions = (searchParams: ArticlesSearch) =>
	queryOptions({
		queryKey: ["articles", searchParams],
		queryFn: () => getFilteredPosts({ data: searchParams }),
		refetchInterval: 1000 * 60,
	});

export const Route = createFileRoute("/articles/")({
	validateSearch: (search: ArticlesSearch): ArticlesSearch => {
		const rawCategory = search.category
			? String(search.category).toLowerCase()
			: "all";

		const matchedCategory = CATEGORIES.find(
			(cat) => cat.toLowerCase() === rawCategory,
		);

		return {
			search: (search.search as string) || "",
			category: matchedCategory || "all",
		};
	},
	loader: async ({ context, location }) => {
		const searchParams = location.search as ArticlesSearch;
		await context.queryClient.ensureQueryData(postsQueryOptions(searchParams));
	},
	component: AllArticlesPage,
	pendingComponent: ArticlesPageSkeleton,
});

/* -------------------------------------------------------------------------- */
/*                               Provider Context                             */
/* -------------------------------------------------------------------------- */

type ArticlesContextType = {
	searchParams: ArticlesSearch;
	searchTerm: string;
	setSearchTerm: (val: string) => void;
	selectedCategory: string;
	setSelectedCategory: (val: string) => void;
	isPending: boolean;
};

const ArticlesContext = createContext<ArticlesContextType | null>(null);

function useArticlesContext() {
	const context = useContext(ArticlesContext);
	if (!context) {
		throw new Error(
			"useArticlesContext must be used within an ArticlesProvider",
		);
	}
	return context;
}

function AllArticlesPage() {
	const navigate = useNavigate();
	const searchParams = Route.useSearch();

	const [searchTerm, setSearchTerm] = useState(searchParams.search || "");
	const [selectedCategory, setSelectedCategory] = useState(
		searchParams.category || "all",
	);

	const [isPending, startTransition] = useTransition();

	const debouncedNavigate = useMemo(
		() =>
			debounce((search: string, category: string) => {
				startTransition(() => {
					navigate({
						to: "/articles",
						search: {
							search: search || "",
							category,
						},
						replace: true,
					});
				});
			}, 300),
		[navigate],
	);

	useEffect(() => {
		debouncedNavigate(searchTerm, selectedCategory);
		return () => {
			debouncedNavigate.cancel();
		};
	}, [searchTerm, selectedCategory, debouncedNavigate]);

	return (
		<ArticlesContext.Provider
			value={{
				searchParams,
				searchTerm,
				setSearchTerm,
				selectedCategory,
				setSelectedCategory,
				isPending,
			}}
		>
			<div className="min-h-screen text-(--text)">
				<div className="max-w-6xl mx-auto px-4 py-12">
					{/* Header Title */}
					<div className="mb-8">
						<Link
							to="/"
							className="text-(--link) hover:underline text-sm font-semibold mb-2 inline-block"
						>
							← Back to Home
						</Link>
						<h1 className="text-4xl font-extrabold text-(--text)">
							All Articles
						</h1>
						<p className="text-(--text-secondary) mt-1">
							Explore all thoughts, tutorials, and insights.
						</p>
					</div>

					<ArticlesContent />
				</div>
			</div>
		</ArticlesContext.Provider>
	);
}

function ArticlesContent() {
	return (
		<>
			<FilterControlsBar />
			<Suspense fallback={<GridSkeleton gridCount={6} />}>
				<PostsGrid />
			</Suspense>
		</>
	);
}

function FilterControlsBar() {
	const { searchTerm, setSearchTerm } = useArticlesContext();

	return (
		<div className="flex flex-col md:flex-row gap-4 mb-10 justify-between items-center">
			{/* Search Input */}
			<div className="w-full md:w-96">
				<input
					type="text"
					placeholder="Search articles by title or keyword..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="w-full bg-(--bg-secondary) border border-(--border) rounded-xl px-4 py-2.5 text-sm text-(--text) placeholder:text-(--text-secondary) focus:outline-none focus:border-(--link) transition-colors"
				/>
			</div>

			<CategoryDropdown />
		</div>
	);
}

function CategoryDropdown() {
	const { selectedCategory, setSelectedCategory } = useArticlesContext();

	const [categoryOpen, setCategoryOpen] = useState(false);
	const [categoryQuery, setCategoryQuery] = useState("");
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setCategoryOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const filteredCategories = useMemo(() => {
		if (!categoryQuery) return CATEGORIES;
		return CATEGORIES.filter((cat) =>
			cat.toLowerCase().includes(categoryQuery.toLowerCase()),
		);
	}, [categoryQuery]);

	return (
		<div className="relative w-full md:w-72" ref={dropdownRef}>
			<Button
				type="button"
				onClick={() => setCategoryOpen(!categoryOpen)}
				className="w-full flex justify-between items-center bg-(--bg-secondary) border border-(--border) rounded-xl px-4 py-2.5 text-sm text-(--text) focus:outline-none focus:border-(--link) transition-colors capitalize"
			>
				<span>
					{selectedCategory === "all" ? "All Categories" : selectedCategory}
				</span>
				<span className="text-(--text-secondary) text-xs">▼</span>
			</Button>

			{categoryOpen && (
				<div className="absolute z-20 mt-2 w-full bg-(--bg-secondary) border border-(--border) rounded-xl shadow-xl overflow-hidden p-2">
					<input
						type="text"
						placeholder="Filter categories..."
						value={categoryQuery}
						onChange={(e) => setCategoryQuery(e.target.value)}
						className="w-full bg-transparent border border-(--border) rounded-lg px-3 py-1.5 text-xs text-(--text) placeholder:text-(--text-secondary) focus:outline-none focus:border-(--link) mb-2"
					/>
					<div className="max-h-48 overflow-y-auto space-y-1 scrollbar-none">
						<Button
							type="button"
							onClick={() => {
								setSelectedCategory("all");
								setCategoryOpen(false);
							}}
							className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${
								selectedCategory === "all"
									? "bg-(--link) text-white font-semibold"
									: "text-(--text-secondary) hover:bg-(--border) hover:text-(--text)"
							}`}
						>
							All Categories
						</Button>
						{filteredCategories.map((cat) => (
							<Button
								key={cat}
								type="button"
								onClick={() => {
									setSelectedCategory(cat);
									setCategoryOpen(false);
								}}
								className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors capitalize ${
									selectedCategory === cat
										? "bg-(--link) text-white font-semibold"
										: "text-(--text-secondary) hover:bg-(--border) hover:text-(--text)"
								}`}
							>
								{cat}
							</Button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function PostsGrid() {
	const { searchParams, isPending } = useArticlesContext();
	const { data: posts } = useSuspenseQuery(postsQueryOptions(searchParams));

	return (
		<div
			className={`transition-opacity duration-200 ${
				isPending ? "opacity-50 pointer-events-none" : "opacity-100"
			}`}
		>
			{posts.length === 0 ? (
				<div className="text-center py-20 border border-dashed min-h-[45dvh] border-(--border) bg-(--bg-secondary) flex justify-center flex-col items-center rounded-2xl">
					<h3 className="text-lg font-bold text-(--text) mb-2">
						No matching posts found
					</h3>
					<p className="text-(--text-secondary) text-sm">
						Try adjusting your search terms or filters.
					</p>
				</div>
			) : (
				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
					{posts.map((post) => (
						<article key={post.id} className="group">
							<Link to="/posts/$postId" params={{ postId: post.id.toString() }}>
								<div className="overflow-hidden rounded-xl mb-4 bg-(--bg-secondary) border border-(--border)">
									{post.image && (
										<img
											src={post.image}
											alt={post.title}
											className="w-full aspect-[16/10] object-cover group-hover:scale-105 transition-transform duration-300"
										/>
									)}
								</div>

								<div className="flex gap-2 overflow-x-auto scrollbar-none truncate mb-2">
									{post.category ? (
										post.category.split(",").map((cat) => (
											<span
												key={cat}
												className="rounded-full border border-(--border) bg-(--bg-secondary) px-3 py-0.5 text-xs font-semibold text-(--link) capitalize"
											>
												{cat.trim()}
											</span>
										))
									) : (
										<span className="rounded-full border border-(--border) bg-(--bg-secondary) px-3 py-0.5 text-xs font-semibold text-(--text-secondary) capitalize">
											General
										</span>
									)}
								</div>

								<h3 className="text-xl font-bold mt-2 mb-2 text-(--text) group-hover:text-(--link) transition-colors">
									{post.title}
								</h3>
								<p className="text-(--text-secondary) line-clamp-2 mb-4 text-sm">
									{post.excerpt}
								</p>

								<div className="flex items-center gap-1.5 text-xs text-(--text-secondary)">
									<span>{new Date(post.date).toDateString()}</span>
									<span>|</span>
									<span>{`By ${post.user?.displayUsername || "Anonymous"}`}</span>
								</div>
							</Link>
						</article>
					))}
				</div>
			)}
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*                               Skeleton UI                                  */
/* -------------------------------------------------------------------------- */

function ArticleCardSkeleton() {
	return (
		<div className="space-y-3 animate-pulse">
			<Skeleton className="w-full aspect-[16/10] rounded-xl bg-(--bg-secondary)" />
			<Skeleton className="h-6 w-20 rounded-full bg-(--bg-secondary)" />
			<Skeleton className="h-6 w-5/6 bg-(--bg-secondary)" />
			<div className="space-y-2">
				<Skeleton className="h-4 w-full bg-(--bg-secondary)" />
				<Skeleton className="h-4 w-2/3 bg-(--bg-secondary)" />
			</div>
			<Skeleton className="h-4 w-24 bg-(--bg-secondary)" />
		</div>
	);
}

function GridSkeleton({ gridCount = 6 }: { gridCount?: number }) {
	return (
		<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
			{Array.from({ length: gridCount }).map((_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: No-fix atm
				<ArticleCardSkeleton key={i} />
			))}
		</div>
	);
}

function ArticlesPageSkeleton() {
	return (
		<div className="min-h-screen text-(--text)">
			<div className="max-w-6xl mx-auto px-4 py-12">
				{/* Header Title Skeleton */}
				<div className="mb-8 space-y-2">
					<Skeleton className="h-4 w-24 bg-(--bg-secondary)" />
					<Skeleton className="h-10 w-64 bg-(--bg-secondary)" />
					<Skeleton className="h-4 w-96 bg-(--bg-secondary)" />
				</div>

				{/* Filter Controls Bar Skeleton */}
				<div className="flex flex-col md:flex-row gap-4 mb-10 justify-between items-center">
					<Skeleton className="h-11 w-full md:w-96 rounded-xl bg-(--bg-secondary)" />
					<Skeleton className="h-11 w-full md:w-72 rounded-xl bg-(--bg-secondary)" />
				</div>

				{/* Grid Skeleton */}
				<GridSkeleton gridCount={6} />
			</div>
		</div>
	);
}
